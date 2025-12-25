const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function initUpload(file) {
    const res = await fetch(`${API_BASE}/upload/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            filename: file.name,
            size: file.size
        })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Init upload failed: ${text}`);
    }

    return res.json();
}

export async function uploadChunk({ uploadId, chunk, index }) {
    const form = new FormData();
    form.append("chunk", chunk);
    form.append("uploadId", uploadId);
    form.append("chunkIndex", index);

    const res = await fetch(`${API_BASE}/upload/chunk`, {
        method: "POST",
        body: form
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Chunk upload failed: ${text}`);
    }
}
