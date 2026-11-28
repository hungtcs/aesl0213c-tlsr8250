import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseBitmapFont, registerBitmapFont } from "../bitmapFont";
import { fitFontSize, renderWithBitmapFont } from "../canvas";

describe("1-bit BitmapFont engine", () => {
  it("loads compiled fusion12 and fusion10 bfnt.z with Chinese, English, and digits", () => {
    const f12Path = path.resolve(process.cwd(), "public/fonts/fusion12.bfnt.z");
    const f10Path = path.resolve(process.cwd(), "public/fonts/fusion10.bfnt.z");
    const f12 = parseBitmapFont(fs.readFileSync(f12Path));
    const f10 = parseBitmapFont(fs.readFileSync(f10Path));

    expect(f12.pixelSize).toBe(12);
    expect(f10.pixelSize).toBe(10);
    expect(f12.glyphCount).toBeGreaterThan(20000);
    expect(f10.glyphCount).toBeGreaterThan(20000);

    // Check ASCII digits, Latin, and CJK characters
    for (const ch of ["0", "8", "A", "王", "维", "终", "南", "清", "欢"]) {
      const cp = ch.codePointAt(0)!;
      expect(f12.findGlyph(cp)).not.toBeNull();
      expect(f10.findGlyph(cp)).not.toBeNull();
    }

    expect(f12.measureWidth("138 0013 8000", 1)).toBeGreaterThan(40);
    expect(f12.measureWidth("138 0013 8000", 2)).toBe(f12.measureWidth("138 0013 8000", 1) * 2);
  });

  it("blits exact integer-grid 1-bit rects without invoking native ctx.fillText", () => {
    const f12Path = path.resolve(process.cwd(), "public/fonts/fusion12.bfnt.z");
    const f10Path = path.resolve(process.cwd(), "public/fonts/fusion10.bfnt.z");
    const f12 = parseBitmapFont(fs.readFileSync(f12Path));
    const f10 = parseBitmapFont(fs.readFileSync(f10Path));
    registerBitmapFont("pixel12", f12);
    registerBitmapFont("pixel10", f10);

    const rects: Array<[number, number, number, number]> = [];
    let nativeFillCalled = false;

    const fakeCtx = {
      font: "24px monospace",
      textAlign: "center" as CanvasTextAlign,
      fillRect(x: number, y: number, w: number, h: number) {
        rects.push([x, y, w, h]);
      },
      fillText() {
        nativeFillCalled = true;
      },
      measureText() {
        return { width: 0 } as TextMetrics;
      },
    } as unknown as CanvasRenderingContext2D;

    renderWithBitmapFont(fakeCtx, (ctx) => {
      const w = ctx.measureText("138").width;
      expect(w).toBe(f12.measureWidth("138", 2));
      ctx.fillText("138", 100, 50);

      // fitFontSize should pick exact crisp 20px (2x fusion10) when 24px doesn't fit
      const chosen = fitFontSize(ctx, "138 0013 8000", 150, 24, 10);
      expect([24, 20, 12, 10]).toContain(chosen);
    });

    expect(nativeFillCalled).toBe(false);
    expect(rects.length).toBeGreaterThan(10);
    // Every blitted rectangle must be on exact integer coordinates and 2x scale
    for (const [x, y, w, h] of rects) {
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
      expect(w % 2).toBe(0);
      expect(h).toBe(2);
    }
  });
});
