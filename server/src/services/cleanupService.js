import fs from "fs";
import path from "path";
import { db } from "../config/db.js";

const UPLOAD_DIR = path.resolve("uploads");
const STALE_HOURS = 24;

export async function cleanupStaleUploads() {
    console.log("🧹 Cleanup job started");

    const [uploads] = await db.execute(
        `
    SELECT id
    FROM uploads
    WHERE status IN ('UPLOADING', 'PROCESSING')
    AND updated_at < NOW() - INTERVAL ? HOUR
    `,
        [STALE_HOURS]
    );

    for (const { id } of uploads) {
        try {
            // 1️⃣ Delete file if exists
            const filePath = path.join(UPLOAD_DIR, id);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // 2️⃣ Delete DB rows (order matters)
            await db.execute(
                `DELETE FROM chunks WHERE upload_id=?`,
                [id]
            );

            await db.execute(
                `DELETE FROM uploads WHERE id=?`,
                [id]
            );

            console.log(`🗑️ Removed stale upload ${id}`);
        } catch (err) {
            console.error(`Cleanup failed for ${id}`, err);
        }
    }

    console.log("🧹 Cleanup job finished");
}
