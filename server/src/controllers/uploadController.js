import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../config/db.js";
import { finaliseUpload } from "../services/finaliseService.js";


const CHUNK_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIR = path.resolve("uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function initUpload(req, res) {
    const { filename, size } = req.body;
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

export async function chunkReceiver(req, res) {
    if (!req.file) {
        return res.status(400).json({
            error: "No file received. Did you send 'chunk' as FormData?"
        });
    }

    try {
        const { uploadId, chunkIndex } = req.body;
        const buffer = req.file.buffer;

        // 1. Idempotency check
        const [[chunk]] = await db.execute(
            `SELECT status FROM chunks WHERE upload_id=? AND chunk_index=?`,
            [uploadId, chunkIndex]
        );

        if (chunk.status === "SUCCESS") {
            return res.sendStatus(200);
        }

        // 2. Ensure target file exists  ✅ FIX 1
        const filePath = path.join(UPLOAD_DIR, uploadId);
        if (!fs.existsSync(filePath)) {
            fs.closeSync(fs.openSync(filePath, "w"));
        }

        // 3. Write chunk at correct offset
        fs.createWriteStream(filePath, {
            flags: "r+",
            start: Number(chunkIndex) * CHUNK_SIZE
        }).end(buffer);

        // 4. Mark chunk complete
        await db.execute(
            `UPDATE chunks SET status='SUCCESS', received_at=NOW()
       WHERE upload_id=? AND chunk_index=?`,
            [uploadId, chunkIndex]
        );

        // 5. Check if upload finished
        const [[{ remaining }]] = await db.execute(
            `SELECT COUNT(*) AS remaining
       FROM chunks WHERE upload_id=? AND status!='SUCCESS'`,
            [uploadId]
        );

        if (remaining === 0) {
            finaliseUpload(uploadId);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
