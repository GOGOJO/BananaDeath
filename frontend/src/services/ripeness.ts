export interface RipenessStage {
  label: string;
  advice: string;
  color: string;
}

/**
 * Plain-language reading of a score on the dataset's 1-8 scale.
 * The cut points are product copy, not something the model learned.
 */
export function ripenessStage(daysLeft: number): RipenessStage {
  if (daysLeft >= 6.5) return { label: "Green", advice: "Still firm. Give it a few more days.", color: "#7cb342" };
  if (daysLeft >= 4.5) return { label: "Ripening", advice: "Turning yellow. Good soon.", color: "#c0ca33" };
  if (daysLeft >= 3) return { label: "Ripe", advice: "Ready to eat now.", color: "#fbc02d" };
  if (daysLeft >= 1.75) return { label: "Very ripe", advice: "Eat it today, or use it for baking.", color: "#f57c00" };
  return { label: "Overripe", advice: "Best for banana bread or smoothies.", color: "#6d4c41" };
}
