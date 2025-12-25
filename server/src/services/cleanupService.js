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
        const conn = await db.getConnection();
        try {
            const filePath = path.join(UPLOAD_DIR, id);

            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath).catch(() => { });
            }

            await conn.beginTransaction();

            await conn.execute(`DELETE FROM chunks WHERE upload_id=?`, [id]);
            await conn.execute(`DELETE FROM uploads WHERE id=?`, [id]);

            await conn.commit();
            console.log(`🗑️ Removed stale upload ${id}`);
        } catch (err) {
            await conn.rollback();
            console.error(`Cleanup failed for ${id}`, err);
        } finally {
            conn.release();
        }
    }

    console.log("🧹 Cleanup job finished");
}
