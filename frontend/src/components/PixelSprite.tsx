import { useMemo } from "react";

import { spriteRects, type Sprite } from "../sprites/pixel";

interface PixelSpriteProps {
  sprite: Sprite;
  /** Screen pixels per sprite pixel; CSS width classes can still override the rendered size. */
  scale?: number;
  className?: string;
  /** Accessible name; decorative sprites leave this out and are hidden from screen readers. */
  label?: string;
}

export default function PixelSprite({ sprite, scale = 4, className, label }: PixelSpriteProps) {
  const rects = useMemo(() => spriteRects(sprite), [sprite]);
  const width = Math.max(...sprite.rows.map((row) => row.length));
  const height = sprite.rows.length;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.width} height={1} fill={r.color} />
      ))}
    </svg>
  );
}
