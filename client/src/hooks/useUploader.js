import { useState, useRef, useEffect, useCallback } from "react";
import { initUpload, uploadChunk } from "../api/uploadApi";
import toast from "react-hot-toast";

const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_CONCURRENCY = 3;
const MAX_RETRIES = 3;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function useUploader() {
    /* ---------------- STATE ---------------- */

    const [chunks, setChunks] = useState([]);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [eta, setEta] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [uploadId, setUploadId] = useState(null);
    const [error, setError] = useState(null);

    /* ---------------- REFS ---------------- */

    const queueRef = useRef([]);
    const activeRef = useRef(0);
    const uploadedBytesRef = useRef(0);
    const sessionStartBytesRef = useRef(0);
    const startTimeRef = useRef(0);
    const uploadIdRef = useRef(null);
    const fileRef = useRef(null);

    const pausedRef = useRef(false);
    const cancelledRef = useRef(false);
    const completionShownRef = useRef(false);

    /* ---------------- LIFECYCLE ---------------- */

    useEffect(() => {
        return () => {
            cancelledRef.current = true;
            queueRef.current = [];
        };
    }, []);

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        const done =
            chunks.length > 0 && chunks.every(c => c.status === "success");

        if (done && !completionShownRef.current) {
            toast.success("Upload completed 🎉");
            completionShownRef.current = true;
        }
    }, [chunks]);

    /* ---------------- WORKER ---------------- */

    const runWorker = useCallback(async () => {
        if (pausedRef.current || cancelledRef.current) return;
        if (activeRef.current >= MAX_CONCURRENCY) return;
        if (!queueRef.current.length) return;

        const item = queueRef.current.shift();
        if (!item || !fileRef.current) return;

        activeRef.current++;

        setChunks(prev =>
            prev.map(c =>
                c.index === item.index ? { ...c, status: "uploading" } : c
            )
        );

        const start = item.index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileRef.current.size);
        const blob = fileRef.current.slice(start, end);

        let attempt = 0;

        while (attempt < MAX_RETRIES && !cancelledRef.current) {
            try {
                await uploadChunk({
                    uploadId: uploadIdRef.current,
                    chunk: blob,
                    index: item.index
                });

                uploadedBytesRef.current += blob.size;

                const sessionBytes = uploadedBytesRef.current - sessionStartBytesRef.current;
                const elapsed = Math.max(
                    (performance.now() - startTimeRef.current) / 1000,
                    0.001
                );
                const bps = sessionBytes / elapsed;

                setSpeed(bps / (1024 * 1024));
                setProgress(
                    Math.round((uploadedBytesRef.current / fileRef.current.size) * 100)
                );

                const remaining = fileRef.current.size - uploadedBytesRef.current;
                setEta(bps > 0 ? remaining / bps : 0);

                setChunks(prev =>
                    prev.map(c =>
                        c.index === item.index ? { ...c, status: "success" } : c
                    )
                );

                break;
            } catch (err) {
                attempt++;
                console.error(`Chunk ${item.index} attempt ${attempt} failed:`, err);

                if (attempt === MAX_RETRIES) {
                    setChunks(prev =>
                        prev.map(c =>
                            c.index === item.index ? { ...c, status: "error" } : c
                        )
                    );
                    toast.error(`Chunk ${item.index} failed after ${MAX_RETRIES} retries`);
                } else {
                    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
                }
            }
        }

        activeRef.current--;

        if (!pausedRef.current && !cancelledRef.current) {
            runWorker();
        }
    }, []);

    /* ---------------- START / RESUME ---------------- */

    const uploadFile = useCallback(
        async (file) => {
            try {
                completionShownRef.current = false;
                cancelledRef.current = false;
                pausedRef.current = false;

                activeRef.current = 0;
                uploadedBytesRef.current = 0;
                sessionStartBytesRef.current = 0;
                startTimeRef.current = performance.now();

                setUploadId(null);
                setProgress(0);
                setSpeed(0);
                setEta(0);
                setIsPaused(false);
                setError(null);

                fileRef.current = file;

                const statusRes = await fetch(
                    `${API_BASE}/upload/status?filename=${encodeURIComponent(
                        file.name
                    )}&size=${file.size}`
                );


                
                if (!statusRes.ok) {
                    throw new Error(`Status check failed: ${statusRes.statusText}`);
                }

                const status = await statusRes.json();

                let uploadId;
                let receivedChunks = [];

                if (status.exists) {
                    uploadId = status.uploadId;
                    receivedChunks = status.receivedChunks || [];
                    toast.success(
                        `Resuming upload (${receivedChunks.length} chunks completed)`
                    );
                } else {
                    const init = await initUpload(file);
                    uploadId = init.uploadId;
                    receivedChunks = init.receivedChunks || [];
                }

                uploadIdRef.current = uploadId;
                setUploadId(uploadId);

                const completedBytes = Math.min(
                    receivedChunks.length * CHUNK_SIZE,
                    file.size
                );

                uploadedBytesRef.current = completedBytes;
                sessionStartBytesRef.current = completedBytes;

                setProgress(Math.round((completedBytes / file.size) * 100));

                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

                const initialChunks = Array.from({ length: totalChunks }, (_, i) => ({
                    index: i,
                    status: receivedChunks.includes(i) ? "success" : "pending"
                }));

                setChunks(initialChunks);
                queueRef.current = initialChunks.filter(c => c.status === "pending");

                for (let i = 0; i < MAX_CONCURRENCY; i++) {
                    runWorker();
                }
            } catch (err) {
                console.error("Upload initialization failed:", err);
                setError(err.message);
                toast.error("Failed to start upload");
                throw err;
            }
        },
        [runWorker]
    );

    /* ---------------- CONTROLS ---------------- */

    const pause = useCallback(() => {
        pausedRef.current = true;
        setIsPaused(true);
        toast("Paused ⏸️");
    }, []);

    const resume = useCallback(() => {
        if (!fileRef.current) {
            toast.error("No file to resume");
            return;
        }

        pausedRef.current = false;
        setIsPaused(false);

        setChunks(prev => {
            queueRef.current = prev.filter(
                c => c.status === "pending" || c.status === "error"
            );
            return prev;
        });

        sessionStartBytesRef.current = uploadedBytesRef.current;
        startTimeRef.current = performance.now();

        toast("Resumed ▶️");

        for (let i = 0; i < MAX_CONCURRENCY; i++) {
            runWorker();
        }
    }, [runWorker]);

    const cancel = useCallback(() => {
        cancelledRef.current = true;
        pausedRef.current = true;
        queueRef.current = [];
        setIsPaused(true);
        toast("Upload cancelled");
    }, []);

    const retry = useCallback(() => {
        if (!fileRef.current || !uploadIdRef.current) {
            toast.error("No upload to retry");
            return;
        }

        setChunks(prev => {
            const updated = prev.map(c =>
                c.status === "error" ? { ...c, status: "pending" } : c
            );
            queueRef.current = updated.filter(c => c.status === "pending");
            return updated;
        });

        cancelledRef.current = false;
        pausedRef.current = false;
        setIsPaused(false);

        sessionStartBytesRef.current = uploadedBytesRef.current;
        startTimeRef.current = performance.now();

        toast("Retrying failed chunks...");

        for (let i = 0; i < MAX_CONCURRENCY; i++) {
            runWorker();
        }
    }, [runWorker]);

    /* ---------------- PUBLIC API ---------------- */

    return {
        uploadFile,
        pause,
        resume,
        cancel,
        retry,
        isPaused,
        chunks,
        progress,
        speed,
        eta,
        uploadId,
        error
    };
}
