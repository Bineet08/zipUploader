const colors = {
    pending: "bg-gray-300",
    uploading: "bg-yellow-400 animate-pulse",
    success: "bg-emerald-500",
    error: "bg-red-500",
};

export default function ChunkGrid({ chunks }) {
    return (
        <div className="grid grid-cols-10 gap-2 mt-4">
            {chunks.map(c => (
                <div
                    key={c.index}
                    className={`h-8 flex items-center justify-center text-xs font-medium rounded text-black ${colors[c.status]}`}
                >
                    {c.index}
                </div>
            ))}
        </div>
    );
}
