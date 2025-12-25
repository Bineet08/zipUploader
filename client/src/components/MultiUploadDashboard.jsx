import { useState } from "react";
import UploadDashboard from "./UploadDashboard";
import { useUploader } from "../hooks/useUploader";

function UploadRow({ item, onRemove }) {
    const uploader = useUploader();

    const handleRemove = () => {
        uploader.cancel();
        onRemove();
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                {/* File info */}
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                        {item.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                        {(item.file.size / 1e6).toFixed(1)} MB
                    </p>
                </div>

                {/* Remove */}
                <button
                    onClick={handleRemove}
                    className="text-slate-400 hover:text-red-500 text-sm"
                    title="Remove"
                >
                    ✕
                </button>
            </div>

            {/* Upload UI */}
            <div className="mt-3">
                <UploadDashboard
                    {...uploader}
                    autoStartFile={item.file}
                    compact
                />
            </div>
        </div>
    );
}

export default function MultiUploadDashboard() {
    const [files, setFiles] = useState([]);

    const handleFiles = (e) => {
        const selected = Array.from(e.target.files).map(file => ({
            id: crypto.randomUUID(),
            file
        }));
        setFiles(prev => [...prev, ...selected]);
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    return (
        <div className="min-h-screen bg-slate-100 flex justify-center p-6">
            <div className="w-full max-w-3xl space-y-6">

                {/* ---------- HEADER ---------- */}
                <div>
                    <h1 className="text-xl font-semibold text-slate-800">
                        Upload Files
                    </h1>
                    <p className="text-sm text-slate-500">
                        Resumable, chunked uploads with pause & resume
                    </p>
                </div>

                {/* ---------- FILE PICKER ---------- */}
                <label className="flex flex-col items-center justify-center
                          border-2 border-dashed border-slate-300
                          rounded-xl bg-white py-8 cursor-pointer
                          hover:border-blue-400 transition">
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFiles}
                    />
                    <p className="text-sm font-medium text-slate-700">
                        Click to upload or drag & drop
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Multiple files supported
                    </p>
                </label>

                {/* ---------- UPLOAD LIST ---------- */}
                {files.length > 0 && (
                    <div className="space-y-3">
                        {files.map(item => (
                            <UploadRow
                                key={item.id}
                                item={item}
                                onRemove={() => removeFile(item.id)}
                            />
                        ))}
                    </div>
                )}

                {/* ---------- EMPTY STATE ---------- */}
                {files.length === 0 && (
                    <div className="text-center text-sm text-slate-500 pt-10">
                        No uploads yet
                    </div>
                )}
            </div>
        </div>
    );
}
