import { useState, useEffect } from "react";
import { useUploader } from "../hooks/useUploader";
import UploadDashboard from "./UploadDashboard";

export default function UploadRow({ item, onRemove }) {
    const uploader = useUploader();
    const [isStarted, setIsStarted] = useState(false);

    // Auto-start upload when component mounts
    useEffect(() => {
        if (!isStarted && item.file) {
            uploader.uploadFile(item.file).catch(err => {
                console.error("Upload failed:", err);
            });
            setIsStarted(true);
        }
    }, [item.file, isStarted, uploader]);

    const handleRemove = () => {
        uploader.cancel();
        onRemove();
    };

    const isComplete = uploader.progress === 100 && uploader.chunks.length > 0;

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4">
                {/* File info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status icon */}
                    <div className="flex-shrink-0 text-xl">
                        {isComplete ? (
                            <span className="text-green-500">✓</span>
                        ) : uploader.isPaused ? (
                            <span className="text-orange-500">⏸</span>
                        ) : uploader.chunks.some(c => c.status === "uploading") ? (
                            <span className="text-blue-500">↑</span>
                        ) : (
                            <span className="text-slate-400">○</span>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">
                            {item.file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                            {(item.file.size / 1e6).toFixed(1)} MB
                        </p>
                    </div>
                </div>

                {/* Remove button */}
                <button
                    onClick={handleRemove}
                    className="flex-shrink-0 text-slate-400 hover:text-red-500 text-lg transition-colors"
                    title="Remove"
                >
                    ✕
                </button>
            </div>

            {/* Upload UI */}
            {uploader.chunks.length > 0 && (
                <div className="mt-3">
                    <UploadDashboard uploader={uploader} compact />
                </div>
            )}

            {/* Error state */}
            {uploader.error && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    Error: {uploader.error}
                </div>
            )}
        </div>
    );
}