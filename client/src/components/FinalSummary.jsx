export default function FinalSummary({ uploadId }) {
    return (
        <div className="bg-emerald-50 border border-emerald-200
                    rounded-xl p-5 space-y-3">

            <h2 className="text-lg font-semibold text-emerald-700">
                ✅ Upload Completed Successfully
            </h2>

            <p className="text-sm text-emerald-800">
                Your file has been fully uploaded and verified.
            </p>

            <div className="text-xs text-slate-600 break-all">
                <span className="font-medium">Upload ID:</span> {uploadId}
            </div>

            <div className="text-xs text-slate-500">
                You can safely close this page.
            </div>
        </div>
    );
}
