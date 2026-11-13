import { lifeHearts, type HeartFill } from "../services/ripeness";
import { heartSprite } from "../sprites/sprites";
import PixelSprite from "./PixelSprite";

const HEARTS: Record<HeartFill, ReturnType<typeof heartSprite>> = {
  full: heartSprite("full"),
  half: heartSprite("half"),
  empty: heartSprite("empty"),
};

interface LifeBarProps {
  daysLeft: number;
  max: number;
}

/** One heart per day of life on the model's scale. */
export default function LifeBar({ daysLeft, max }: LifeBarProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-pixel text-[0.6rem] uppercase">Life</span>
        <span className="font-pixel text-[0.6rem] text-ink-soft">
          {daysLeft.toFixed(1)} / {max}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Life left in days"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Number(daysLeft.toFixed(1))}
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {lifeHearts(daysLeft, max).map((fill, i) => (
          <PixelSprite key={i} sprite={HEARTS[fill]} scale={4} />
        ))}
      </div>
    </div>
  );
}
