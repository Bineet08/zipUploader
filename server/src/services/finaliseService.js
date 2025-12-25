import fs from "fs";
import path from "path";
import crypto from "crypto";
import unzipper from "unzipper";
import { db } from "../config/db.js";

const UPLOAD_DIR = path.resolve("uploads");

export async function finaliseUpload(uploadId) {
    /* ---------- LOCK ROW & MOVE TO PROCESSING ---------- */
    const conn = await db.getConnection();
    await conn.beginTransaction();

    const [[upload]] = await conn.execute(
        `SELECT status FROM uploads WHERE id=? FOR UPDATE`,
        [uploadId]
    );

    if (!upload || upload.status !== "UPLOADING") {
        await conn.rollback();
        conn.release();
        return;
    }

    await conn.execute(
        `UPDATE uploads SET status='PROCESSING' WHERE id=?`,
        [uploadId]
    );

    await conn.commit();
    conn.release();

    const filePath = path.join(UPLOAD_DIR, uploadId);

    /* ---------- COMPUTE FINAL HASH ---------- */
    let finalHash;
    try {
        const hash = crypto.createHash("sha256");

        await new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath);
            stream.on("data", chunk => hash.update(chunk));
            stream.on("end", resolve);
            stream.on("error", reject);
        });

        finalHash = hash.digest("hex");
    } catch (err) {
        console.error("Hashing failed:", err);
        await db.execute(
            `UPDATE uploads SET status='FAILED' WHERE id=?`,
            [uploadId]
        );
        return;
    }

    /* ---------- OPTIONAL ZIP PEEK (NON-BLOCKING) ---------- */
    try {
        await new Promise(resolve => {
            fs.createReadStream(filePath)
                .pipe(unzipper.Parse())
                .on("entry", entry => {
                    if (!entry.path.includes("/")) {
                        console.log("Top-level ZIP entry:", entry.path);
                    }
                    entry.autodrain();
                })
                .on("error", () => resolve()) // Not a ZIP → ignore
                .on("close", resolve);
        });
    } catch {
        // Intentionally ignored
    }

    /* ---------- FINAL AUTHORITATIVE UPDATE ---------- */
    await db.execute(
        `
        UPDATE uploads
        SET status='COMPLETED',
            final_hash=?,
            completed_at=NOW()
        WHERE id=?
        `,
        [finalHash, uploadId]
    );
}
