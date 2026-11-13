/** A sprite is a grid of palette keys; "." is transparent. */
export interface Sprite {
  rows: string[];
  palette: Record<string, string>;
}

/** Inclusive column spans that are filled on each row, indexed by row. */
export type Spans = [number, number][][];

/** Build a grid from row spans, tracing a one-pixel outline ("o") around the filled area. */
export function shapeFromSpans(width: number, spans: Spans, fill = "b"): string[][] {
  const inside = spans.map((row) => {
    const cells = new Array<boolean>(width).fill(false);
    for (const [from, to] of row) for (let x = from; x <= to; x++) cells[x] = true;
    return cells;
  });
  const filled = (x: number, y: number) => inside[y]?.[x] ?? false;
  return inside.map((row, y) =>
    row.map((cell, x) => {
      if (!cell) return ".";
      const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      return edge ? "o" : fill;
    }),
  );
}

/** Overwrite cells; out-of-bounds points are ignored so sprite tweaks can't throw. */
export function paint(grid: string[][], key: string, points: [number, number][]): void {
  for (const [x, y] of points) {
    if (grid[y]?.[x] !== undefined) grid[y][x] = key;
  }
}

export const toRows = (grid: string[][]): string[] => grid.map((row) => row.join(""));

/** Merge horizontal runs of one color into single rectangles to keep the DOM small. */
export function spriteRects(sprite: Sprite): { x: number; y: number; width: number; color: string }[] {
  const rects: { x: number; y: number; width: number; color: string }[] = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x;
      while (row[end + 1] === key) end++;
      if (key !== ".") {
        const color = sprite.palette[key];
        if (!color) throw new Error(`Sprite uses "${key}" but the palette has no color for it.`);
        rects.push({ x, y, width: end - x + 1, color });
      }
      x = end + 1;
    }
  });
  return rects;
}

/** Serialize a sprite as an SVG data URL, for use as a CSS background tile. */
export function spriteDataUrl(sprite: Sprite): string {
  const width = Math.max(...sprite.rows.map((row) => row.length));
  const body = spriteRects(sprite)
    .map((r) => `<rect x='${r.x}' y='${r.y}' width='${r.width}' height='1' fill='${r.color}'/>`)
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${sprite.rows.length}' shape-rendering='crispEdges'>${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
