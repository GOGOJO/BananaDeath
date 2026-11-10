import { describe, expect, it } from "vitest";

import { letterbox, rgbaToTensor, validateFile } from "./preprocess";
import { ripenessStage } from "./ripeness";

describe("letterbox", () => {
  it("fits a wide image to the width and centers it vertically", () => {
    expect(letterbox(300, 150, 224)).toEqual({ x: 0, y: 56, width: 224, height: 112 });
  });

  it("fits a tall image to the height", () => {
    const box = letterbox(100, 200, 224);
    expect(box.height).toBeCloseTo(224, 9);
    expect(box.x).toBeCloseTo(56, 9);
  });
});

describe("rgbaToTensor", () => {
  it("writes channel-first normalized values and ignores alpha", () => {
    const rgba = new Uint8ClampedArray([255, 0, 51, 7, 0, 255, 102, 9, 0, 0, 0, 0, 0, 0, 0, 0]);
    const tensor = Array.from(rgbaToTensor(rgba, 2, [0, 0, 0], [1, 1, 1]));
    const red = tensor.slice(0, 4);
    const green = tensor.slice(4, 8);
    const blue = tensor.slice(8, 12);
    expect(tensor).toHaveLength(12);
    [1, 0, 0, 0].forEach((v, i) => expect(red[i]).toBeCloseTo(v, 6));
    [0, 1, 0, 0].forEach((v, i) => expect(green[i]).toBeCloseTo(v, 6));
    [0.2, 0.4, 0, 0].forEach((v, i) => expect(blue[i]).toBeCloseTo(v, 6));
  });

  it("applies the mean and std per channel", () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255]);
    const tensor = rgbaToTensor(rgba, 1, [0.5, 0.5, 0.5], [0.25, 0.5, 1]);
    expect(Array.from(tensor)).toEqual([2, 1, 0.5]);
  });
});

describe("validateFile", () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], "x", { type });

  it("accepts a small jpeg", () => expect(validateFile(file("image/jpeg", 10))).toBeNull());
  it("rejects other types", () => expect(validateFile(file("image/gif", 10))).toMatch(/JPEG/));
  it("rejects large files", () => expect(validateFile(file("image/png", 11 * 1024 * 1024))).toMatch(/10 MB/));
  it("rejects empty files", () => expect(validateFile(file("image/png", 0))).toMatch(/empty/));
});

describe("ripenessStage", () => {
  it("maps the ends of the scale", () => {
    expect(ripenessStage(8).label).toBe("Green");
    expect(ripenessStage(1).label).toBe("Overripe");
  });
});
