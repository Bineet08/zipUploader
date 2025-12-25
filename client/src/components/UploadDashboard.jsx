import { useUploader } from "../hooks/useUploader";
import ProgressBar from "./ProgressBar";
import ChunkGrid from "./ChunkGrid";

export default function UploadDashboard() {
    const { uploadFile, chunks, progress, speed, eta, pause, resume, isPaused } = useUploader();
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6 space-y-6">

                <h1 className="text-xl font-semibold text-gray-800">
                    Resumable Chunked Uploader
                </h1>

                <input
                    type="file"
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                     file:rounded file:border-0
                     file:bg-emerald-500 file:text-white
                     hover:file:bg-emerald-600"
                    onChange={e => uploadFile(e.target.files[0])}
                />

                <ProgressBar value={progress} />

                <div className="flex justify-between text-sm text-gray-600">
                    <span>{progress}%</span>
                    <span>{speed.toFixed(2)} MB/s</span>
                    <span>ETA: {isFinite(eta) ? Math.round(eta) : "--"}s</span>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={pause}
                        disabled={isPaused}
                        className="px-4 py-2 rounded bg-yellow-500 text-white disabled:opacity-50"
                    >
                        Pause
                    </button>

                    <button
                        onClick={resume}
                        disabled={!isPaused}
                        className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
                    >
                        Resume
                    </button>
                </div>

                <ChunkGrid chunks={chunks} />

            </div>
        </div>
    );
}
