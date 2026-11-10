import { ripenessStage } from "../services/ripeness";
import type { Prediction } from "../types/prediction";

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const { daysLeft, daysLeftRounded, range } = prediction;
  const stage = ripenessStage(daysLeft);
  const position = ((range.max - daysLeft) / (range.max - range.min)) * 100;

  return (
    <section aria-live="polite" className="rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Estimate</p>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-5xl font-bold text-stone-900">~{daysLeftRounded}</span>
        <span className="text-lg text-stone-600">{daysLeftRounded === 1 ? "day" : "days"} left</span>
      </div>
      <p className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: stage.color }}>
        {stage.label}
      </p>
      <p className="mt-3 text-stone-700">{stage.advice}</p>

      <div className="mt-6">
        <div className="relative h-3 rounded-full bg-gradient-to-r from-lime-500 via-yellow-400 to-amber-900">
          <span
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-stone-900 shadow"
            style={{ left: `${position}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-stone-500">
          <span>{range.max} · fresh</span>
          <span>{range.min} · overripe</span>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-stone-500">
        Model score {daysLeft.toFixed(2)} on an {range.min}–{range.max} scale. The training labels come from the day number in each
        photo's filename in a public Kaggle dataset, not from measured shelf life, and the model is off by about 0.7 days on
        average on held-out photos. Treat this as a rough guide.
      </p>
    </section>
  );
}
