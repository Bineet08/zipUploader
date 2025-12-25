export async function initUpload(file) {
    const res = await fetch("http://localhost:4000/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            filename: file.name,
            size: file.size
        })
    });
    return res.json();
}

export async function uploadChunk({ uploadId, chunk, index }) {
    const form = new FormData();
    form.append("chunk", chunk);
    form.append("uploadId", uploadId);
    form.append("chunkIndex", index);

    const res = await fetch("http://localhost:4000/upload/chunk", {
        method: "POST",
        body: form
    });

    if (!res.ok) throw new Error("Chunk upload failed");
}
