import ProgressBar from "./ProgressBar";
import ChunkGrid from "./ChunkGrid";
import FinalSummary from "./FinalSummary";

export default function UploadDashboard({
    uploadFile,
    pause,
    resume,
    isPaused,
    chunks,
    progress,
    speed,
    eta,
    uploadId
}) {
    const isIdle = chunks.length === 0;

    const isCompleted =
        chunks.length > 0 &&
        chunks.every(c => c.status === "success");

    const hasError = chunks.some(c => c.status === "error");

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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6 space-y-6">

                {/* ---------- HEADER ---------- */}
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-slate-800">
                        Resumable File Upload
                    </h1>

                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                        {statusLabel}
                    </span>
                </div>

                {/* ---------- FILE INPUT ---------- */}
                {!chunks.length && (
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
                {chunks.length > 0 && (
                    <>
                        <ProgressBar value={progress} />

                        <div className="flex justify-between text-sm text-slate-600">
                            <span>{progress}% completed</span>
                            <span>{speed.toFixed(2)} MB/s</span>
                            <span>
                                ETA: {isFinite(eta) ? Math.round(eta) : "--"}s
                            </span>
                        </div>
                    </>
                )}

                {/* ---------- ACTION BUTTONS ---------- */}
                {!isCompleted && chunks.length > 0 && (
                    <div className="flex gap-3">
                        <button
                            onClick={pause}
                            disabled={isPaused}
                            className="px-4 py-2 rounded-lg bg-yellow-500 text-white
                         disabled:opacity-50"
                        >
                            Pause
                        </button>

                        <button
                            onClick={resume}
                            disabled={!isPaused}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white
                         disabled:opacity-50"
                        >
                            Resume
                        </button>
                    </div>
                )}

                {/* ---------- ERROR BANNER ---------- */}
                {hasError && !isCompleted && (
                    <div className="bg-red-50 border border-red-200 text-red-700
                          px-4 py-2 rounded-lg text-sm">
                        ⚠ Some chunks failed. Resume to retry.
                    </div>
                )}

                {/* ---------- CHUNK GRID + LEGEND ---------- */}
                {chunks.length > 0 && !isCompleted && (
                    <>
                        <ChunkGrid chunks={chunks} />

                        <div className="flex gap-4 text-xs text-slate-600 mt-2">
                            <span>⬜ Pending</span>
                            <span>🟨 Uploading</span>
                            <span>🟩 Success</span>
                            <span>🟥 Failed</span>
                        </div>
                    </>
                )}

                {/* ---------- FINAL SUMMARY PANEL ---------- */}
                {isCompleted && (
                    <FinalSummary uploadId={uploadId} />
                )}
            </div>
        </div>
    );
}
