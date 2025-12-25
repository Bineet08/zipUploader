import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { db } from "../config/db.js";
import { finaliseUpload } from "../services/finaliseService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHUNK_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(__dirname, "../../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ================= INIT UPLOAD ================= */

export async function initUpload(req, res) {
    const { filename, size } = req.body;

    if (!filename || !size) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const totalChunks = Math.ceil(size / CHUNK_SIZE);
    const uploadId = crypto.randomUUID();

    await db.execute(
        `INSERT INTO uploads (id, filename, total_size, total_chunks)
     VALUES (?, ?, ?, ?)`,
        [uploadId, filename, size, totalChunks]
    );

    for (let i = 0; i < totalChunks; i++) {
        await db.execute(
            `INSERT INTO chunks (upload_id, chunk_index)
       VALUES (?, ?)`,
            [uploadId, i]
        );
    }

    res.json({ uploadId, receivedChunks: [] });
}

/* ================= CHUNK RECEIVER ================= */

export async function chunkReceiver(req, res) {
    if (!req.file) {
        return res.status(400).json({
            error: "No file received. Did you send 'chunk' as FormData?"
        });
    }

    try {
        const { uploadId, chunkIndex } = req.body;
        const buffer = req.file.buffer;
        const index = Number(chunkIndex);

        /* ---------- Validate input ---------- */
        if (!uploadId || Number.isNaN(index)) {
            return res.status(400).json({ error: "Invalid chunk metadata" });
        }

        /* ---------- Idempotency check ---------- */
        const [[chunk]] = await db.execute(
            `SELECT status FROM chunks WHERE upload_id=? AND chunk_index=?`,
            [uploadId, index]
        );

        if (!chunk) {
            return res.status(400).json({ error: "Invalid chunk index" });
        }

        if (chunk.status === "SUCCESS") {
            return res.sendStatus(200);
        }

        /* ---------- Ensure target file exists ---------- */
        const filePath = path.join(UPLOAD_DIR, uploadId);
        if (!fs.existsSync(filePath)) {
            fs.closeSync(fs.openSync(filePath, "w"));
        }

        /* ---------- Write chunk (WAIT for completion) ---------- */
        await new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(filePath, {
                flags: "r+",
                start: index * CHUNK_SIZE
            });

            stream.on("error", reject);
            stream.on("finish", resolve);
            stream.end(buffer);
        });

        /* ---------- Mark chunk complete ---------- */
        await db.execute(
            `UPDATE chunks
       SET status='SUCCESS', received_at=NOW()
       WHERE upload_id=? AND chunk_index=?`,
            [uploadId, index]
        );

        /* ---------- Check if upload finished ---------- */
        const [[{ remaining }]] = await db.execute(
            `SELECT COUNT(*) AS remaining
       FROM chunks
       WHERE upload_id=? AND status!='SUCCESS'`,
            [uploadId]
        );

        if (remaining === 0) {
            finaliseUpload(uploadId); // async, non-blocking
        }

        res.sendStatus(200);
    } catch (err) {
        console.error("Chunk receiver error:", err);
        res.sendStatus(500);
    }
}
