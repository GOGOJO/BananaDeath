import type { ReactNode } from "react";

interface PanelTitleProps {
  children: ReactNode;
  aside?: ReactNode;
  tone?: "forest" | "banana";
}

/** The title strip across the top of a game-menu window. */
export default function PanelTitle({ children, aside, tone = "forest" }: PanelTitleProps) {
  const colors = tone === "forest" ? "bg-forest text-paper" : "bg-banana text-ink";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-b-4 border-ink px-4 py-3 ${colors}`}>
      <h2 className="font-pixel text-[0.7rem] leading-none uppercase sm:text-xs">{children}</h2>
      {aside}
    </div>
  );
}
