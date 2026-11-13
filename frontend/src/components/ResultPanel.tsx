import { useEffect, useRef } from "react";

import { ripenessStage } from "../services/ripeness";
import { bananaSprite } from "../sprites/sprites";
import type { Prediction } from "../types/prediction";
import LifeBar from "./LifeBar";
import PanelTitle from "./PanelTitle";
import PixelSprite from "./PixelSprite";

interface ResultPanelProps {
  prediction: Prediction;
  previewUrl: string | null;
  onAgain: () => void;
}

export default function ResultPanel({ prediction, previewUrl, onAgain }: ResultPanelProps) {
  const { daysLeft, daysLeftRounded, range } = prediction;
  const stage = ripenessStage(daysLeft);
  const heading = useRef<HTMLDivElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section aria-live="polite" className="px-panel-raised">
      <PanelTitle tone="banana">★ Checkup complete! ★</PanelTitle>

      <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-6">
          <div className="grid w-56 place-items-center bg-sky px-6 pt-6 shadow-[0_0_0_4px_#3b3024]">
            <PixelSprite sprite={bananaSprite(stage.key)} scale={7} label={`Pixel-art banana at the ${stage.label.toLowerCase()} stage`} />
            <div className="mt-1 h-3 w-[calc(100%+3rem)] bg-forest" aria-hidden />
          </div>
          {previewUrl && (
            <figure className="flex items-center gap-3">
              <img src={previewUrl} alt="Your banana photo" className="px-slot h-16 w-16 bg-slot object-cover p-1" />
              <figcaption className="font-pixel text-[0.5rem] leading-relaxed text-ink-soft uppercase">Your item</figcaption>
            </figure>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div ref={heading} tabIndex={-1} className="focus:outline-none">
            <span className="px-badge text-paper" style={{ backgroundColor: stage.color }}>
              {stage.label}
            </span>
            <p className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="font-pixel text-sm uppercase">About</span>
              <span className="font-display text-7xl leading-none font-bold">{daysLeftRounded}</span>
              <span className="font-pixel text-sm uppercase">{daysLeftRounded === 1 ? "day" : "days"} left</span>
            </p>
          </div>

          <LifeBar daysLeft={daysLeft} max={range.max} />

          <div className="bg-cream p-4 shadow-[0_0_0_2px_#3b3024]">
            <p className="font-display text-xl font-bold">“{stage.flavor}”</p>
            <p className="mt-1 text-ink">{stage.advice}</p>
          </div>

          <p className="text-sm leading-relaxed text-ink-soft">
            The model scored this photo {daysLeft.toFixed(2)} on a {range.min}–{range.max} scale, where {range.max} is fresh and{" "}
            {range.min} is overripe. It learned from photos labeled by day in a public Kaggle dataset, not from measured shelf life,
            and is off by about 0.7 days on average on photos it never saw, so treat this as a rough guide.
          </p>

          <div>
            <button type="button" onClick={onAgain} className="px-btn px-btn-green">
              ↻ Analyze another banana
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
