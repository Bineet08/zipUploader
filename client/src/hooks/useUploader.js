import { useState, useRef, useEffect } from "react";
import { initUpload, uploadChunk } from "../api/uploadApi";
import toast from "react-hot-toast";

const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 3;

export function useUploader() {
    const [chunks, setChunks] = useState([]);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [eta, setEta] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const queueRef = useRef([]);
    const activeRef = useRef(0);
    const uploadedBytesRef = useRef(0);
    const startTimeRef = useRef(Date.now());
    const uploadIdRef = useRef(null);
    const fileRef = useRef(null);

    // 🔒 Guard to prevent duplicate completion toasts
    const completedToastShownRef = useRef(false);

    /* ---------------- COMPLETION TOAST ---------------- */

    useEffect(() => {
        const allDone =
            chunks.length > 0 &&
            chunks.every(c => c.status === "success");

        if (allDone && !completedToastShownRef.current) {
            toast.success("Upload completed successfully 🎉");
            completedToastShownRef.current = true;
        }
    }, [chunks]);

    /* ---------------- SCHEDULER ---------------- */

    const schedule = async () => {
        if (isPaused) return;
        if (activeRef.current >= MAX_CONCURRENCY) return;
        if (!queueRef.current.length) return;

        const item = queueRef.current.shift();
        activeRef.current++;

        setChunks(prev =>
            prev.map(c =>
                c.index === item.index
                    ? { ...c, status: "uploading" }
                    : c
            )
        );

        const start = item.index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileRef.current.size);
        const blob = fileRef.current.slice(start, end);

        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                await uploadChunk({
                    uploadId: uploadIdRef.current,
                    chunk: blob,
                    index: item.index
                });

                uploadedBytesRef.current += blob.size;

                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                const bytesPerSec = uploadedBytesRef.current / elapsed;

                setSpeed(bytesPerSec / (1024 * 1024));
                setProgress(
                    Math.round(
                        (uploadedBytesRef.current / fileRef.current.size) * 100
                    )
                );
                setEta(
                    (fileRef.current.size - uploadedBytesRef.current) /
                    bytesPerSec
                );

                setChunks(prev =>
                    prev.map(c =>
                        c.index === item.index
                            ? { ...c, status: "success" }
                            : c
                    )
                );
                break;
            } catch (err) {
                attempt++;
                await new Promise(r => setTimeout(r, 2 ** attempt * 1000));

                if (attempt === MAX_RETRIES) {
                    setChunks(prev =>
                        prev.map(c =>
                            c.index === item.index
                                ? { ...c, status: "error" }
                                : c
                        )
                    );
                }
            }
        }

        activeRef.current--;
        schedule(); // pull next chunk
    };

    /* ---------------- START UPLOAD ---------------- */

    const uploadFile = async (file) => {
        // Reset state
        completedToastShownRef.current = false;
        setProgress(0);
        setSpeed(0);
        setEta(0);
        setIsPaused(false);

        fileRef.current = file;
        startTimeRef.current = Date.now();
        uploadedBytesRef.current = 0;

        const { uploadId, receivedChunks = [] } = await initUpload(file);
        uploadIdRef.current = uploadId;

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        const initialChunks = Array.from(
            { length: totalChunks },
            (_, i) => ({
                index: i,
                status: receivedChunks.includes(i) ? "success" : "pending"
            })
        );

        setChunks(initialChunks);

        queueRef.current = initialChunks.filter(
            c => c.status === "pending"
        );

        for (let i = 0; i < MAX_CONCURRENCY; i++) {
            schedule();
        }
    };

    /* ---------------- PAUSE / RESUME ---------------- */

    const pause = () => {
        setIsPaused(true);
        toast("Upload paused ⏸️");
    };

    const resume = () => {
        setIsPaused(false);

        queueRef.current = chunks.filter(
            c => c.status === "pending" || c.status === "error"
        );

        toast("Upload resumed ▶️");

        for (let i = 0; i < MAX_CONCURRENCY; i++) {
            schedule();
        }
    };

    /* ---------------- PUBLIC API ---------------- */

    return {
        uploadFile,
        pause,
        resume,
        isPaused,
        chunks,
        progress,
        speed,
        eta
    };
}
