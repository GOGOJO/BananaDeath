import ErrorBanner from "../components/ErrorBanner";
import ImagePreview from "../components/ImagePreview";
import PredictionCard from "../components/PredictionCard";
import StatusPanel from "../components/StatusPanel";
import UploadDropzone from "../components/UploadDropzone";
import { usePrediction } from "../hooks/usePrediction";

export default function HomePage() {
  const { status, file, previewUrl, prediction, error, downloadProgress, source, selectFile, reset } = usePrediction();
  const busy = status === "loading-model" || status === "predicting";

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-stone-900">
            <span aria-hidden>🍌 </span>Banana Death
          </h1>
          <a href="https://github.com/GOGOJO/BananaDeath" className="text-sm text-stone-500 hover:text-stone-800">
            Source on GitHub
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">How long has your banana got?</h2>
          <p className="mt-2 text-stone-600">
            Upload a photo and a ResNet18 model estimates where it sits between fresh and overripe.
            {source === "browser" && " The model runs in your browser, so your photo never leaves your device."}
          </p>
        </div>

        {!file && <UploadDropzone onFile={selectFile} disabled={busy} />}

        {error && <ErrorBanner message={error} onRetry={reset} />}

        {file && previewUrl && (
          <div className="grid gap-6 md:grid-cols-2">
            <ImagePreview url={previewUrl} name={file.name} />
            <div className="space-y-4">
              {busy && <StatusPanel status={status} progress={downloadProgress} />}
              {prediction && <PredictionCard prediction={prediction} />}
              {!busy && (
                <button
                  type="button"
                  onClick={reset}
                  className="w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white hover:bg-stone-700"
                >
                  Try another photo
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-6 pb-10 text-xs text-stone-400">
        Trained on the CC0 "Days-death-to-a-banana" Kaggle dataset. A portfolio project, not food-safety advice.
      </footer>
    </div>
  );
}
