import { useState } from "react";
import UploadRow from "./UploadRow";

export default function MultiUploadDashboard() {
    const [files, setFiles] = useState([]);

    const handleFiles = (e) => {
        const selected = Array.from(e.target.files).map(file => ({
            id: crypto.randomUUID(),
            file,
            addedAt: Date.now()
        }));
        setFiles(prev => [...prev, ...selected]);
        e.target.value = ""; // Reset for re-selection
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const clearAll = () => {
        if (confirm(`Remove all ${files.length} files?`)) {
            setFiles([]);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex justify-center p-6">
            <div className="w-full max-w-3xl space-y-6">

                {/* ---------- HEADER ---------- */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">
                                Multi-File Uploader
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Chunked uploads with pause, resume & retry support
                            </p>
                        </div>

                        {files.length > 0 && (
                            <div className="text-right">
                                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                                    {files.length}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    {files.length === 1 ? 'file' : 'files'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ---------- FILE PICKER ---------- */}
                <label className="group flex flex-col items-center justify-center
                          border-2 border-dashed border-slate-300
                          rounded-2xl bg-white py-16 cursor-pointer
                          hover:border-blue-400 hover:bg-blue-50/30 
                          transition-all duration-200 shadow-sm">
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFiles}
                    />
                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                        📁
                    </div>
                    <p className="text-base font-semibold text-slate-700">
                        Click to select files
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                        or drag and drop here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Multiple files supported • Recommended max 100MB per file
                    </p>
                </label>

                {/* ---------- UPLOAD LIST ---------- */}
                {files.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-semibold text-slate-700">
                                Active Uploads ({files.length})
                            </h2>
                            <button
                                onClick={clearAll}
                                className="text-xs text-slate-500 hover:text-red-600 font-medium transition-colors"
                            >
                                Clear all
                            </button>
                        </div>

                        <div className="space-y-3">
                            {files.map(item => (
                                <UploadRow
                                    key={item.id}
                                    item={item}
                                    onRemove={() => removeFile(item.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ---------- EMPTY STATE ---------- */}
                {files.length === 0 && (
                    <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-200">
                        <div className="text-7xl mb-6 opacity-20">📤</div>
                        <p className="text-lg font-medium text-slate-600 mb-2">
                            No files selected
                        </p>
                        <p className="text-sm text-slate-400">
                            Click the upload area above to get started
                        </p>
                    </div>
                )}

                {/* ---------- FOOTER INFO ---------- */}
                <div className="text-center text-xs text-slate-400 space-y-1">
                    <p>Uploads are chunked (5MB per chunk) and can be paused/resumed</p>
                    <p>Each file maintains its own upload state independently</p>
                </div>
            </div>
        </div>
    );
}