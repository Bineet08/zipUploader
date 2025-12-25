import { useState, useRef, useEffect, useCallback } from "react";
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
    const [uploadId, setUploadId] = useState(null);
    const queueRef = useRef([]);
    const activeRef = useRef(0);
    const uploadedBytesRef = useRef(0);
    const startTimeRef = useRef(0);
    const uploadIdRef = useRef(null);
    const fileRef = useRef(null);

    const pausedRef = useRef(false);
    const cancelledRef = useRef(false);
    const completionShownRef = useRef(false);

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        const done =
            chunks.length > 0 &&
            chunks.every(c => c.status === "success");

        if (done && !completionShownRef.current) {
            toast.success("Upload completed 🎉");
            completionShownRef.current = true;
        }
    }, [chunks]);

    const runWorker = async () => {
        if (pausedRef.current || cancelledRef.current) return;
        if (activeRef.current >= MAX_CONCURRENCY) return;
        if (!queueRef.current.length) return;

        const item = queueRef.current.shift();
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

                const elapsed = (performance.now() - startTimeRef.current) / 1000;
                const bps = uploadedBytesRef.current / elapsed;

                setSpeed(bps / (1024 * 1024));
                setProgress(
                    Math.round((uploadedBytesRef.current / fileRef.current.size) * 100)
                );
                setEta(bps > 0 ? (fileRef.current.size - uploadedBytesRef.current) / bps : 0);

                setChunks(prev =>
                    prev.map(c =>
                        c.index === item.index ? { ...c, status: "success" } : c
                    )
                );
                break;
            } catch {
                attempt++;
                if (attempt === MAX_RETRIES) {
                    setChunks(prev =>
                        prev.map(c =>
                            c.index === item.index ? { ...c, status: "error" } : c
                        )
                    );
                }
            }
        }

        activeRef.current--;
        if (!pausedRef.current && !cancelledRef.current) {
            runWorker();
        }
    };

    const uploadFile = useCallback(async (file) => {
        completionShownRef.current = false;
        cancelledRef.current = false;
        pausedRef.current = false;

        startTimeRef.current = performance.now();

        setUploadId(null);
        setProgress(0);
        setSpeed(0);
        setEta(0);
        setIsPaused(false);

        fileRef.current = file;
        uploadedBytesRef.current = 0;

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
    }, []);


    const pause = () => {
        pausedRef.current = true;
        setIsPaused(true);
        toast("Paused ⏸️");
    };

    const resume = () => {
        pausedRef.current = false;
        setIsPaused(false);
        queueRef.current = chunks.filter(
            c => c.status === "pending" || c.status === "error"
        );
        toast("Resumed ▶️");
        for (let i = 0; i < MAX_CONCURRENCY; i++) {
            runWorker();
        }
    };

    const cancel = () => {
        cancelledRef.current = true;
        queueRef.current = [];
    };

    return {
        uploadFile,
        pause,
        resume,
        cancel,
        isPaused,
        chunks,
        progress,
        speed,
        eta,
        uploadId
    };
}
