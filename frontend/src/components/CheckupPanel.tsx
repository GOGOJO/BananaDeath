import type { CheckupStatus, ModelState } from "../hooks/usePrediction";
import type { InferenceSource } from "../types/prediction";
import ErrorBox from "./ErrorBox";
import PanelTitle from "./PanelTitle";
import UploadSlot from "./UploadSlot";

interface CheckupPanelProps {
  status: CheckupStatus;
  file: File | null;
  previewUrl: string | null;
  error: string | null;
  model: ModelState;
  source: InferenceSource;
  onFile: (file: File) => void;
  onAnalyze: () => void;
  onRemove: () => void;
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

function downloadPercent(model: ModelState): number | null {
  const { progress } = model;
  return progress?.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;
}

function ModelBadge({ model, source }: { model: ModelState; source: InferenceSource }) {
  if (source === "api") return <span className="px-badge bg-paper text-ink">Server model</span>;
  if (model.status === "ready") return <span className="px-badge bg-sage text-ink">Model ready</span>;
  if (model.status === "error") return <span className="px-badge bg-orange text-ink">Model offline</span>;
  const percent = downloadPercent(model);
  return <span className="px-badge bg-banana text-ink">Model {percent === null ? "loading" : `${percent}%`}</span>;
}

/** A segmented progress bar; with no known total it shows an empty track. */
function PixelProgress({ percent, label }: { percent: number | null; label: string }) {
  const filled = percent === null ? 0 : Math.round(percent / 10);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-4 flex-1 shadow-[0_0_0_2px_#3b3024] ${i < filled ? "bg-forest" : "bg-slot"}`} />
      ))}
    </div>
  );
}

export default function CheckupPanel({ status, file, previewUrl, error, model, source, onFile, onAnalyze, onRemove }: CheckupPanelProps) {
  const analyzing = status === "analyzing";
  const waitingForModel = analyzing && model.status === "loading";
  const percent = downloadPercent(model);

  return (
    <div className="px-panel-raised">
      <PanelTitle aside={<ModelBadge model={model} source={source} />}>Inventory · Select item</PanelTitle>

      <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[16rem_1fr]">
        <UploadSlot onFile={onFile} previewUrl={previewUrl} fileName={file?.name ?? null} disabled={analyzing} />

        <div className="flex min-w-0 flex-col gap-5">
          {file ? (
            <div>
              <p className="font-pixel text-[0.6rem] text-ink-soft uppercase">Item</p>
              <p className="mt-2 truncate font-display text-2xl font-bold" title={file.name}>
                {file.name}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {mb(file.size)} MB · {file.type.replace("image/", "").toUpperCase()}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-2xl font-bold">Choose a banana</p>
              <p className="mt-2 leading-relaxed text-ink-soft">
                Drag a photo into the slot, or click it to browse. JPEG, PNG, or WebP, up to 10 MB.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                <span className="font-pixel text-[0.55rem] text-forest uppercase">Tip</span> One banana, decent light, and a plain
                background give the best reading.
              </p>
            </div>
          )}

          {error && (
            <ErrorBox message={error}>
              {file && (
                <button type="button" onClick={onAnalyze} className="px-btn px-btn-primary">
                  Try again
                </button>
              )}
            </ErrorBox>
          )}

          {analyzing && (
            <div role="status" className="space-y-3">
              <p className="font-pixel text-[0.6rem] leading-relaxed uppercase">
                {waitingForModel ? "Loading banana brain…" : "Scanning banana…"}
              </p>
              {waitingForModel && (
                <>
                  <PixelProgress percent={percent} label="Model download" />
                  <p className="text-sm text-ink-soft">
                    {model.progress
                      ? `${mb(model.progress.loaded)}${model.progress.total ? ` of ${mb(model.progress.total)}` : ""} MB.`
                      : "Starting the download."}{" "}
                    This only happens once; your browser keeps it afterwards.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-5 pt-2">
            <button type="button" onClick={onAnalyze} disabled={!file || analyzing} className="px-btn px-btn-primary px-7 py-5 text-sm">
              {analyzing ? "Analyzing…" : "Analyze banana"}
            </button>
            {file && !analyzing && (
              <button type="button" onClick={onRemove} className="px-btn px-btn-plain">
                Remove
              </button>
            )}
          </div>

          {source === "browser" && (
            <p className="text-sm text-ink-soft">The model runs in your browser, so your photo never leaves your device.</p>
          )}
        </div>
      </div>
    </div>
  );
}
