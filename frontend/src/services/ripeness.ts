export type StageKey = "green" | "ripening" | "ripe" | "very-ripe" | "overripe";

export interface RipenessStage {
  key: StageKey;
  label: string;
  advice: string;
  flavor: string;
  color: string;
}

/**
 * Plain-language reading of a score on the dataset's 1-8 scale.
 * The cut points are product copy, not something the model learned.
 */
export function ripenessStage(daysLeft: number): RipenessStage {
  if (daysLeft >= 6.5) {
    return { key: "green", label: "Green", advice: "Still firm. Give it a few more days.", flavor: "A young banana with its whole life ahead of it.", color: "#386641" };
  }
  if (daysLeft >= 4.5) {
    return { key: "ripening", label: "Ripening", advice: "Turning yellow. Good soon.", flavor: "Growing up fast.", color: "#6a994e" };
  }
  if (daysLeft >= 3) {
    return { key: "ripe", label: "Ripe", advice: "Ready to eat now.", flavor: "Peak banana. This is its moment.", color: "#b9822f" };
  }
  if (daysLeft >= 1.75) {
    return { key: "very-ripe", label: "Very ripe", advice: "Eat it today, or use it for baking.", flavor: "HP is running low. Act fast.", color: "#d9622b" };
  }
  return { key: "overripe", label: "Overripe", advice: "Best for banana bread or smoothies.", flavor: "It's not dead. It's banana bread.", color: "#6b4f2a" };
}

export type HeartFill = "full" | "half" | "empty";

/** One heart per day on the scale, rounded to the nearest half heart. */
export function lifeHearts(daysLeft: number, max: number): HeartFill[] {
  const halves = Math.round(Math.min(Math.max(daysLeft, 0), max) * 2);
  return Array.from({ length: max }, (_, i) => {
    if (halves >= (i + 1) * 2) return "full";
    if (halves === i * 2 + 1) return "half";
    return "empty";
  });
}
