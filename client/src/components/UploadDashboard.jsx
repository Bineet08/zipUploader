export default function UploadDashboard({ uploader }) {
    const { chunks, progress, speed, eta, isPaused } = uploader;
    const isComplete = progress === 100 && chunks.length > 0;
    const formatTime = (seconds) => {
        if (!seconds || !isFinite(seconds)) return "--";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const formatSpeed = (mbps) => {
        if (mbps >= 1) return `${mbps.toFixed(1)} MB/s`;
        return `${(mbps * 1024).toFixed(0)} KB/s`;
    };

    const success = chunks.filter(c => c.status === "success").length;
    const errors = chunks.filter(c => c.status === "error").length;

    // Full dashboard view
    return (
        <div className="space-y-4 p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">Upload Progress</h3>
                <span className="text-2xl font-bold text-blue-600">{progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-500 to-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-xs text-slate-500">Speed</div>
                    <div className="text-sm font-semibold text-slate-800">
                        {formatSpeed(speed)}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-500">ETA</div>
                    <div className="text-sm font-semibold text-slate-800">
                        {formatTime(eta)}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-500">Chunks</div>
                    <div className="text-sm font-semibold text-slate-800">
                        {success}/{chunks.length}
                    </div>
                </div>
            </div>
            {/* Controls */}
            <div className="flex gap-2">
                {isComplete ? (
                    <button
                        disabled={true}
                        className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Success
                    </button>
                ) :
                    !isPaused ? (
                        <button
                            onClick={uploader.pause}
                            className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                            ⏸ Pause
                        </button>
                    ) : (
                        <button
                            onClick={uploader.resume}
                            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                        >
                            ▶ Resume
                        </button>
                    )}

                {errors > 0 && (
                    <button
                        onClick={uploader.retry}
                        className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                    >
                        🔄 Retry Failed
                    </button>
                )}
            </div>
        </div>
    );
}
