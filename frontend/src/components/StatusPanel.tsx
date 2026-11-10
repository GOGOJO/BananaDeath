import type { PredictionStatus } from "../hooks/usePrediction";

interface StatusPanelProps {
  status: PredictionStatus;
  progress: { loaded: number; total: number | null } | null;
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

export default function StatusPanel({ status, progress }: StatusPanelProps) {
  const downloading = status === "loading-model";
  const percent = progress?.total ? Math.round((progress.loaded / progress.total) * 100) : null;

  return (
    <div role="status" className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" aria-hidden />
        <p className="font-medium text-stone-800">{downloading ? "Downloading the model…" : "Looking at your banana…"}</p>
      </div>
      {downloading && (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full bg-yellow-400 transition-all" style={{ width: `${percent ?? 10}%` }} />
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {progress ? `${mb(progress.loaded)}${progress.total ? ` of ${mb(progress.total)}` : ""} MB` : "Starting…"} — this
            happens once, then your browser keeps it.
          </p>
        </>
      )}
    </div>
  );
}
