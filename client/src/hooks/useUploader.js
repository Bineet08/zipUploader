import { useState, useRef, useEffect } from "react";
import { initUpload, uploadChunk } from "../api/uploadApi";
import toast from "react-hot-toast";

const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_CONCURRENCY = Number(import.meta.env.VITE_MAX_CONCURRENCY) || 3;
const MAX_RETRIES = 3;

export function useUploader() {
    /* ---------- STATE ---------- */
    const [chunks, setChunks] = useState([]);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [eta, setEta] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [uploadId, setUploadId] = useState(null);

    /* ---------- REFS ---------- */
    const queueRef = useRef([]);
    const activeRef = useRef(0);
    const uploadedBytesRef = useRef(0);
    const startTimeRef = useRef(0);
    const fileRef = useRef(null);
    const uploadIdRef = useRef(null);
    const pausedRef = useRef(false);
    const completionShownRef = useRef(false);

    /* ---------- COMPLETION ---------- */
    useEffect(() => {
        if (
            chunks.length &&
            chunks.every(c => c.status === "success") &&
            !completionShownRef.current
        ) {
            completionShownRef.current = true;
            toast.success("Upload completed successfully 🎉");
        }
    }, [chunks]);

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    /* ---------- CORE WORKER ---------- */
    const runWorker = async () => {
        while (
            !pausedRef.current &&
            activeRef.current < MAX_CONCURRENCY &&
            queueRef.current.length
        ) {
            const chunk = queueRef.current.shift();
            activeRef.current++;

            setChunks(prev =>
                prev.map(c =>
                    c.index === chunk.index
                        ? { ...c, status: "uploading" }
                        : c
                )
            );

            const start = chunk.index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, fileRef.current.size);
            const blob = fileRef.current.slice(start, end);

            let success = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await uploadChunk({
                        uploadId: uploadIdRef.current,
                        chunk: blob,
                        index: chunk.index
                    });

                    uploadedBytesRef.current += blob.size;

                    const elapsed = (Date.now() - startTimeRef.current) / 1000;
                    const bps = uploadedBytesRef.current / Math.max(elapsed, 1);

                    setSpeed(bps / (1024 * 1024));
                    setProgress(
                        Math.floor(
                            (uploadedBytesRef.current / fileRef.current.size) * 100
                        )
                    );
                    setEta(
                        Math.max(
                            0,
                            (fileRef.current.size - uploadedBytesRef.current) / bps
                        )
                    );

                    setChunks(prev =>
                        prev.map(c =>
                            c.index === chunk.index
                                ? { ...c, status: "success" }
                                : c
                        )
                    );

                    success = true;
                    break;
                } catch {
                    if (attempt < MAX_RETRIES) {
                        await new Promise(r =>
                            setTimeout(r, 2 ** attempt * 500)
                        );
                    }
                }
            }

            if (!success) {
                setChunks(prev =>
                    prev.map(c =>
                        c.index === chunk.index
                            ? { ...c, status: "error" }
                            : c
                    )
                );
            }

            activeRef.current--;
        }
    };

    /* ---------- START ---------- */
    const uploadFile = async file => {
        completionShownRef.current = false;

        fileRef.current = file;
        startTimeRef.current = Date.now();
        uploadedBytesRef.current = 0;

        setProgress(0);
        setSpeed(0);
        setEta(0);
        setIsPaused(false);

        const { uploadId: id, receivedChunks = [] } = await initUpload(file);

        uploadIdRef.current = id;
        setUploadId(id);

        const total = Math.ceil(file.size / CHUNK_SIZE);
        const initial = Array.from({ length: total }, (_, i) => ({
            index: i,
            status: receivedChunks.includes(i) ? "success" : "pending"
        }));

        setChunks(initial);
        queueRef.current = initial.filter(c => c.status === "pending");

        for (let i = 0; i < MAX_CONCURRENCY; i++) {
            runWorker();
        }
    };

    /* ---------- PAUSE / RESUME ---------- */
    const pause = () => {
        pausedRef.current = true;
        setIsPaused(true);
        toast("Upload paused ⏸️");
    };

    const resume = () => {
        pausedRef.current = false;
        setIsPaused(false);

        queueRef.current = chunks
            .filter(c => c.status === "pending" || c.status === "error")
            .map(c => ({ ...c, status: "pending" }));

        setChunks(prev =>
            prev.map(c =>
                c.status === "error" ? { ...c, status: "pending" } : c
            )
        );

        toast("Upload resumed ▶️");

        for (let i = 0; i < MAX_CONCURRENCY; i++) {
            runWorker();
        }
    };

    const reset = () => {
        fileRef.current = null;
        uploadIdRef.current = null;
        queueRef.current = [];
        activeRef.current = 0;
        uploadedBytesRef.current = 0;
        completionShownRef.current = false;

        setChunks([]);
        setProgress(0);
        setSpeed(0);
        setEta(0);
        setUploadId(null);
        setIsPaused(false);
    };


    return {
        uploadFile,
        pause,
        resume,
        chunks,
        progress,
        speed,
        eta,
        uploadId,
        isPaused,
        reset
    };
}
