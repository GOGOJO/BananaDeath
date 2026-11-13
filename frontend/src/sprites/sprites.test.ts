import { describe, expect, it } from "vitest";

import { lifeHearts, ripenessStage, type StageKey } from "../services/ripeness";
import { shapeFromSpans, spriteRects, type Sprite } from "./pixel";
import { appleSprite, bananaSprite, cloudSprite, flowerSprite, GROUND_TILE, heartSprite } from "./sprites";

const STAGES: StageKey[] = ["green", "ripening", "ripe", "very-ripe", "overripe"];

function expectWellFormed(sprite: Sprite) {
  const widths = new Set(sprite.rows.map((row) => row.length));
  expect(widths.size).toBe(1);
  expect(() => spriteRects(sprite)).not.toThrow();
}

describe("sprites", () => {
  it.each(STAGES)("draws a rectangular banana with a full palette for %s", (stage) => {
    expectWellFormed(bananaSprite(stage));
  });

  it("gives every stage a different look", () => {
    const drawings = new Set(STAGES.map((stage) => JSON.stringify(bananaSprite(stage))));
    expect(drawings.size).toBe(STAGES.length);
  });

  it("draws the scenery sprites without missing colors", () => {
    for (const sprite of [cloudSprite(), appleSprite(), flowerSprite("#fff"), GROUND_TILE, heartSprite("full"), heartSprite("half"), heartSprite("empty")]) {
      expectWellFormed(sprite);
    }
  });

  it("outlines the edge of a filled shape", () => {
    expect(shapeFromSpans(3, [[[0, 2]], [[0, 2]], [[0, 2]]]).map((row) => row.join(""))).toEqual(["ooo", "obo", "ooo"]);
  });

  it("merges runs of one color into a single rectangle", () => {
    expect(spriteRects({ rows: ["aab."], palette: { a: "#000", b: "#fff" } })).toEqual([
      { x: 0, y: 0, width: 2, color: "#000" },
      { x: 2, y: 0, width: 1, color: "#fff" },
    ]);
  });
});

describe("lifeHearts", () => {
  it("rounds to the nearest half heart", () => {
    expect(lifeHearts(2.6, 4)).toEqual(["full", "full", "half", "empty"]);
    expect(lifeHearts(2.8, 4)).toEqual(["full", "full", "full", "empty"]);
  });

  it("clamps scores outside the scale", () => {
    expect(lifeHearts(-1, 3)).toEqual(["empty", "empty", "empty"]);
    expect(lifeHearts(99, 3)).toEqual(["full", "full", "full"]);
  });
});

describe("ripenessStage", () => {
  it("maps the scale ends to the outer stages", () => {
    expect(ripenessStage(8).key).toBe("green");
    expect(ripenessStage(1).key).toBe("overripe");
    expect(ripenessStage(3).key).toBe("ripe");
  });
});
