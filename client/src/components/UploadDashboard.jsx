import { useEffect, useRef, useState } from "react";
import ProgressBar from "./ProgressBar";
import ChunkGrid from "./ChunkGrid";
import FinalSummary from "./FinalSummary";

export default function UploadDashboard({
    uploadFile,
    pause,
    resume,
    isPaused,
    chunks = [],
    progress = 0,
    speed = 0,
    eta = 0,
    uploadId,
    autoStartFile,
    compact = false
}) {
    /* ---------- AUTO START (STRICT-MODE SAFE) ---------- */
    const startedRef = useRef(false);

    useEffect(() => {
        if (autoStartFile && !startedRef.current) {
            startedRef.current = true;
            uploadFile(autoStartFile);
        }
    }, [autoStartFile, uploadFile]);
    const [showChunks, setShowChunks] = useState(false);


    /* ---------- DROPDOWN STATE ---------- */

    /* ---------- STATE DERIVATIONS ---------- */
    const isIdle = chunks.length === 0;

    const isCompleted =
        chunks.length > 0 &&
        chunks.every(c => c.status === "success");

    const hasError = chunks.some(c => c.status === "error");

    const totalChunks = chunks.length;
    const successChunks = chunks.filter(c => c.status === "success").length;
    const pendingChunks = chunks.filter(c => c.status === "pending").length;
    const errorChunks = chunks.filter(c => c.status === "error").length;

    const statusLabel = isIdle
        ? "Idle"
        : isCompleted
            ? "Completed"
            : isPaused
                ? "Paused"
                : "Uploading";

    const statusColor = isIdle
        ? "bg-slate-100 text-slate-600"
        : isCompleted
            ? "bg-emerald-100 text-emerald-700"
            : isPaused
                ? "bg-yellow-100 text-yellow-700"
                : "bg-blue-100 text-blue-700";

    /* ---------- RENDER ---------- */
    return (
        <div className="space-y-4">

            {/* ---------- HEADER (hidden in compact mode) ---------- */}
            {!compact && (
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">
                        File Upload
                    </h2>
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}
                    >
                        {statusLabel}
                    </span>
                </div>
            )}

            {/* ---------- IDLE STATE ---------- */}
            {isIdle && !autoStartFile && (
                <input
                    type="file"
                    onChange={e => uploadFile(e.target.files[0])}
                    className="block w-full text-sm
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700"
                />
            )}

            {/* ---------- PROGRESS ---------- */}
            {!isIdle && (
                <>
                    <ProgressBar value={progress} />

                    <div className="flex justify-between text-xs text-slate-600">
                        <span>{progress}%</span>
                        <span>{speed.toFixed(2)} MB/s</span>
                        <span>
                            ETA {isFinite(eta) ? Math.round(eta) : "--"}s
                        </span>
                    </div>
                </>
            )}

            {/* ---------- CONTROLS + DROPDOWN TOGGLE ---------- */}
            {!isCompleted && !isIdle && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={pause}
                        disabled={isPaused}
                        className="px-3 py-1.5 rounded-md
              bg-yellow-500 text-white text-xs
              disabled:opacity-40"
                    >
                        Pause
                    </button>

                    <button
                        onClick={resume}
                        disabled={!isPaused}
                        className="px-3 py-1.5 rounded-md
              bg-blue-600 text-white text-xs
              disabled:opacity-40"
                    >
                        Resume
                    </button>

                    {/* ---------- CHUNK DROPDOWN BUTTON ---------- */}
                    <button
                        onClick={() => setShowChunks(v => !v)}
                        className="ml-auto text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1"
                    >
                        Chunks ({totalChunks})
                        <span>{showChunks ? "▲" : "▼"}</span>
                    </button>
                </div>
            )}

            {/* ---------- CHUNK DROPDOWN ---------- */}
            {showChunks && !isIdle && !isCompleted && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">

                    {/* ---------- DROPDOWN HEADER ---------- */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">
                            Chunk Details
                        </span>
                        <button
                            onClick={() => setShowChunks(false)}
                            className="text-xs text-slate-500 hover:text-slate-800"
                        >
                            Close ✕
                        </button>
                    </div>

                    {/* ---------- COUNTS ---------- */}
                    <div className="flex justify-between text-xs text-slate-700">
                        <span>Total</span>
                        <span>{totalChunks}</span>
                    </div>

                    <div className="flex justify-between text-xs text-emerald-700">
                        <span>Completed</span>
                        <span>{successChunks}</span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-600">
                        <span>Pending</span>
                        <span>{pendingChunks}</span>
                    </div>

                    {errorChunks > 0 && (
                        <div className="flex justify-between text-xs text-red-600">
                            <span>Failed</span>
                            <span>{errorChunks}</span>
                        </div>
                    )}

                    {/* ---------- GRID ---------- */}
                    <ChunkGrid chunks={chunks} />
                </div>
            )}


            {/* ---------- ERROR ---------- */}
            {hasError && !isCompleted && (
                <div className="text-xs text-red-600">
                    Some chunks failed. Resume to retry.
                </div>
            )}

            {/* ---------- FINAL SUMMARY ---------- */}
            {isCompleted && (
                <FinalSummary uploadId={uploadId} />
            )}
        </div>
    );
}
