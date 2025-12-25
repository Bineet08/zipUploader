import fs from "fs";
import path from "path";
import crypto from "crypto";
import unzipper from "unzipper";
import { db } from "../config/db.js";

export async function finaliseUpload(uploadId) {
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

    const filePath = path.resolve("uploads", uploadId);

    // ---------------- HASHING ----------------
    const hash = crypto.createHash("sha256");
    const readStream = fs.createReadStream(filePath);

    readStream.on("error", async err => {
        console.error("File read error:", err);
        await db.execute(
            `UPDATE uploads SET status='FAILED' WHERE id=?`,
            [uploadId]
        );
    });

    readStream.pipe(hash);

    readStream.on("end", async () => {
        const finalHash = hash.digest("hex");

        // Save hash immediately
        await db.execute(
            `UPDATE uploads SET final_hash=? WHERE id=?`,
            [finalHash, uploadId]
        );

        // ---------------- ZIP PEEK (NON-BLOCKING) ----------------
        fs.createReadStream(filePath)
            .pipe(unzipper.Parse())
            .on("entry", entry => {
                if (!entry.path.includes("/")) {
                    console.log("Top-level ZIP entry:", entry.path);
                }
                entry.autodrain();
            })
            .on("error", err => {
                // Not a ZIP — this is OK
                console.warn("ZIP peek skipped:", err.message);
            })
            .on("close", async () => {
                // Always mark completed
                await db.execute(
                    `UPDATE uploads SET status='COMPLETED' WHERE id=?`,
                    [uploadId]
                );
            });
    });
}
