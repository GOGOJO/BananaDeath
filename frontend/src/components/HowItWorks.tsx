import type { StageKey } from "../services/ripeness";
import { bananaSprite } from "../sprites/sprites";
import PixelSprite from "./PixelSprite";

const STEPS = [
  { title: "Snap", body: "Take a photo of one banana. Decent light and a plain background help." },
  {
    title: "Scan",
    body: "A ResNet18 network, fine-tuned on about 400 labeled banana photos, reads the color and spots. It runs in your browser with ONNX Runtime.",
  },
  { title: "Result", body: "You get an estimate of days left on a 1–8 scale, plus advice on what to do with your banana." },
];

const FIELD_GUIDE: { key: StageKey; label: string; days: string }[] = [
  { key: "green", label: "Green", days: "6.5+ days" },
  { key: "ripening", label: "Ripening", days: "4.5–6.5" },
  { key: "ripe", label: "Ripe", days: "3–4.5" },
  { key: "very-ripe", label: "Very ripe", days: "1.75–3" },
  { key: "overripe", label: "Overripe", days: "under 1.75" },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-4 border-y-4 border-ink bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="font-pixel text-[0.6rem] text-forest uppercase">How it works</p>
        <h2 className="mt-3 font-display text-4xl font-bold">Three steps to a verdict</h2>

        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="px-panel p-5">
              <span className="px-badge bg-banana">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 font-pixel text-xs uppercase">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>

        <h3 className="mt-16 font-display text-2xl font-bold">Banana field guide</h3>
        <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {FIELD_GUIDE.map((entry) => (
            <li key={entry.key} className="px-slot flex flex-col items-center gap-3 px-3 pt-5 pb-4 text-center">
              <PixelSprite sprite={bananaSprite(entry.key)} scale={3} />
              <span className="font-pixel text-[0.55rem] leading-none uppercase">{entry.label}</span>
              <span className="text-sm text-ink-soft">{entry.days}</span>
            </li>
          ))}
        </ul>

        <div className="mt-16 bg-cream p-5 shadow-[0_0_0_2px_#3b3024]">
          <p className="font-pixel text-[0.6rem] uppercase">Fine print</p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The training labels come from the day number in each photo's filename in the CC0 "Days-death-to-a-banana" Kaggle
            dataset, not from measured shelf life. On held-out photos the model is off by about 0.7 days on average. It's a
            portfolio project, not food-safety advice.
          </p>
        </div>
      </div>
    </section>
  );
}
