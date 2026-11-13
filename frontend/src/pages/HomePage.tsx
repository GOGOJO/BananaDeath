import CheckupPanel from "../components/CheckupPanel";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import ResultPanel from "../components/ResultPanel";
import SiteNav, { GITHUB_URL } from "../components/SiteNav";
import { usePrediction } from "../hooks/usePrediction";

export default function HomePage() {
  const { status, file, previewUrl, prediction, error, model, source, selectFile, analyze, reset } = usePrediction();

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main>
        <Hero />

        <section id="checkup" className="scroll-mt-4 mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <p className="font-pixel text-[0.6rem] text-forest uppercase">Checkup</p>
          <h2 className="mt-3 mb-10 font-display text-4xl font-bold">Put a banana on the scale</h2>
          {status === "done" && prediction ? (
            <ResultPanel prediction={prediction} previewUrl={previewUrl} onAgain={reset} />
          ) : (
            <CheckupPanel
              status={status}
              file={file}
              previewUrl={previewUrl}
              error={error}
              model={model}
              source={source}
              onFile={selectFile}
              onAnalyze={analyze}
              onRemove={reset}
            />
          )}
        </section>

        <HowItWorks />
      </main>

      <footer className="bg-forest text-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <p className="font-pixel text-[0.55rem] leading-relaxed uppercase">Banana Death · Game over for bananas since 2026</p>
          <p className="text-sm">
            <a href={GITHUB_URL} className="underline underline-offset-4 hover:text-banana">
              Source on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
