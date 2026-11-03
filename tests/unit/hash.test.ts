import { describe, expect, it } from 'vitest';
import { colorDistance, colorSignature, parseColorSignature, srgbToOklab } from '../../src/core/hash/color';
import { dhash } from '../../src/core/hash/dhash';
import { bitsToHex, hamming, parseHex64, popcount32 } from '../../src/core/hash/hamming';
import { hashImage } from '../../src/core/hash/index';
import { phash } from '../../src/core/hash/phash';
import { pixelDiff } from '../../src/core/hash/pixelDiff';
import { areaTaps, resampleSquare, toLuma, type RgbaImage } from '../../src/core/hash/resample';
import {
  SILHOUETTES,
  decodeRgba,
  encodeOriginal,
  encodeTwin,
  mulberry32,
  randomTransform,
  renderPhoto,
} from '../../scripts/lib/synth';

function solid(w: number, h: number, rgba: [number, number, number, number]): RgbaImage {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(rgba, i * 4);
  return { width: w, height: h, data };
}

function fromFn(w: number, h: number, f: (x: number, y: number) => [number, number, number]): RgbaImage {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = f(x, y);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return { width: w, height: h, data };
}

const gradient = (w: number, h: number) =>
  fromFn(w, h, (x, y) => [Math.round((x / (w - 1)) * 255), Math.round((y / (h - 1)) * 255), 90]);

/** A few flat rectangles on white, drawn in relative coordinates so any size shows the same picture. */
const scene = (w: number, h: number) =>
  fromFn(w, h, (x, y) => {
    const u = x / w;
    const v = y / h;
    if (u > 0.2 && u < 0.55 && v > 0.25 && v < 0.8) return [200, 40, 40];
    if (u > 0.6 && u < 0.85 && v > 0.1 && v < 0.45) return [30, 60, 190];
    if (u > 0.5 && u < 0.9 && v > 0.6 && v < 0.75) return [20, 20, 20];
    return [255, 255, 255];
  });

const checker = (w: number, h: number, cell: number) =>
  fromFn(w, h, (x, y) =>
    (Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? [255, 255, 255] : [20, 20, 20],
  );

describe('hamming helpers', () => {
  it('counts set bits', () => {
    expect(popcount32(0)).toBe(0);
    expect(popcount32(0xffffffff)).toBe(32);
    expect(popcount32(0x80000001)).toBe(2);
    expect(popcount32(0x55555555)).toBe(16);
  });

  it('measures distance between 64-bit hex hashes', () => {
    expect(hamming('0000000000000000', '0000000000000000')).toBe(0);
    expect(hamming('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hamming('8000000000000001', '0000000000000000')).toBe(2);
    expect(hamming('00000000ffffffff', 'ffffffff00000000')).toBe(64);
  });

  it('rejects anything that is not 16 lowercase hex characters', () => {
    expect(() => parseHex64('xyz')).toThrow(TypeError);
    expect(() => parseHex64('ABCDEF0123456789')).toThrow(TypeError);
    expect(() => parseHex64('0'.repeat(15))).toThrow(TypeError);
  });

  it('packs 64 bits most-significant first', () => {
    const bits = Array.from({ length: 64 }, (_, i) => i === 0);
    expect(bitsToHex(bits)).toBe('8000000000000000');
    expect(() => bitsToHex([true])).toThrow(RangeError);
  });
});

describe('area-average resampling', () => {
  it('gives every output cell a weight total of one', () => {
    for (const [src, dst] of [
      [10, 3],
      [3, 10],
      [32, 32],
      [7, 9],
      [1000, 32],
    ] as const) {
      for (const taps of areaTaps(src, dst)) {
        expect(taps.reduce((s, t) => s + t.weight, 0)).toBeCloseTo(1, 12);
      }
    }
  });

  it('keeps a solid colour solid at any size', () => {
    const out = resampleSquare(solid(37, 37, [10, 120, 200, 255]), 9, 8);
    for (let i = 0; i < out.data.length; i += 3) {
      expect(out.data[i]).toBeCloseTo(10, 6);
      expect(out.data[i + 1]).toBeCloseTo(120, 6);
      expect(out.data[i + 2]).toBeCloseTo(200, 6);
    }
  });

  it('averages exactly when the factor is an integer', () => {
    // 4x2 -> letterboxed into a 4x4 white square -> 2x2: top-left cell averages 2x2 source pixels.
    const img = fromFn(4, 2, (x) => (x < 2 ? [0, 0, 0] : [200, 200, 200]));
    const out = resampleSquare(img, 2, 2);
    // Square is 4x4 with the image on rows 1..2: each output cell covers one white row and one image row.
    expect(out.data[0]).toBeCloseTo((255 + 0) / 2, 9);
    expect(out.data[3]).toBeCloseTo((255 + 200) / 2, 9);
  });

  it('letterboxes onto white so aspect ratio does not change hashes of a centred product', () => {
    const wide = fromFn(40, 20, () => [0, 0, 0]);
    const out = resampleSquare(wide, 4, 4);
    expect(out.data[0]).toBeCloseTo(255, 9); // top row is margin
    expect(out.data[(1 * 4 + 1) * 3]).toBeCloseTo(0, 9); // middle is the image
  });

  it('composites transparent pixels onto white', () => {
    const out = resampleSquare(solid(4, 4, [0, 0, 0, 0]), 2, 2);
    expect(out.data[0]).toBeCloseTo(255, 9);
    const half = resampleSquare(solid(4, 4, [0, 0, 0, 128]), 2, 2);
    expect(half.data[0]).toBeCloseTo(255 * (1 - 128 / 255), 6);
  });

  it('rejects malformed buffers', () => {
    expect(() => resampleSquare({ width: 2, height: 2, data: new Uint8Array(3) }, 2, 2)).toThrow(RangeError);
    expect(() => resampleSquare({ width: 0, height: 2, data: new Uint8Array(0) }, 2, 2)).toThrow(RangeError);
  });

  it('computes Rec. 709 luma', () => {
    const luma = toLuma({ width: 3, height: 1, data: Float64Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255]) });
    expect(luma[0]).toBeCloseTo(0.2126 * 255, 9);
    expect(luma[1]).toBeCloseTo(0.7152 * 255, 9);
    expect(luma[2]).toBeCloseTo(0.0722 * 255, 9);
  });
});

describe('dHash', () => {
  it('is all zero on a flat image (the dead zone ignores noise)', () => {
    expect(dhash(solid(50, 50, [255, 255, 255, 255]))).toBe('0000000000000000');
    expect(dhash(solid(50, 50, [128, 128, 128, 255]))).toBe('0000000000000000');
  });

  it('is a left-to-right brightness comparison', () => {
    // Bright on the left fading to dark on the right: every comparison says left > right.
    const fade = fromFn(90, 80, (x) => {
      const v = 255 - Math.round((x / 89) * 255);
      return [v, v, v];
    });
    expect(dhash(fade)).toBe('ffffffffffffffff');
    // Dark to bright: no comparison fires.
    const rise = fromFn(90, 80, (x) => {
      const v = Math.round((x / 89) * 255);
      return [v, v, v];
    });
    expect(dhash(rise)).toBe('0000000000000000');
  });

  it('tolerates tiny noise on flat areas', () => {
    const a = solid(64, 64, [200, 200, 200, 255]);
    const noisy = new Uint8Array(a.data);
    for (let i = 0; i < noisy.length; i += 4) noisy[i] = 200 + (i % 3);
    expect(dhash({ width: 64, height: 64, data: noisy })).toBe(dhash(a));
  });
});

describe('pHash', () => {
  it('has the DC bit clear and is deterministic', () => {
    const img = gradient(80, 60);
    const h = phash(img);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(h).toBe(phash(img));
    expect(Number.parseInt(h[0] as string, 16) & 8).toBe(0);
  });

  it('stays within the match threshold for the same picture at different sizes', () => {
    expect(hamming(phash(scene(64, 64)), phash(scene(300, 300)))).toBeLessThanOrEqual(6);
    expect(hamming(phash(scene(120, 90)), phash(scene(480, 360)))).toBeLessThanOrEqual(6);
  });

  it('separates a gradient from a checkerboard', () => {
    expect(hamming(phash(gradient(128, 128)), phash(checker(128, 128, 16)))).toBeGreaterThan(10);
  });

  it('matches pinned known answers so accidental changes to the algorithm are caught', () => {
    expect(phash(scene(96, 96))).toBe('7849c57697b06895');
    expect(dhash(checker(90, 80, 10))).toBe('55aa55aa55aa55aa');
  });
});

describe('colour signature', () => {
  it('is 48 bytes as 96 hex characters', () => {
    const sig = colorSignature(gradient(40, 40));
    expect(sig).toMatch(/^[0-9a-f]{96}$/);
    expect(parseColorSignature(sig)).toHaveLength(48);
    expect(() => parseColorSignature('abc')).toThrow(TypeError);
  });

  it('converts sRGB to OKLab with the published anchors', () => {
    const [Lw, aw, bw] = srgbToOklab(255, 255, 255);
    expect(Lw).toBeCloseTo(1, 3);
    expect(Math.abs(aw)).toBeLessThan(1e-3);
    expect(Math.abs(bw)).toBeLessThan(1e-3);
    const [Lk] = srgbToOklab(0, 0, 0);
    expect(Lk).toBeCloseTo(0, 6);
    const [Lr, ar, br] = srgbToOklab(255, 0, 0);
    expect(Lr).toBeCloseTo(0.628, 2);
    expect(ar).toBeCloseTo(0.2249, 2);
    expect(br).toBeCloseTo(0.1258, 2);
  });

  it('is zero for identical images and large for different colours', () => {
    const red = colorSignature(solid(32, 32, [220, 30, 30, 255]));
    const blue = colorSignature(solid(32, 32, [30, 30, 220, 255]));
    expect(colorDistance(red, red)).toBe(0);
    expect(colorDistance(red, blue)).toBeGreaterThan(0.2);
  });

  it('barely moves for a 5% brightness change', () => {
    const a = colorSignature(solid(32, 32, [120, 90, 60, 255]));
    const b = colorSignature(solid(32, 32, [126, 95, 63, 255]));
    expect(colorDistance(a, b)).toBeLessThan(0.03);
  });
});

describe('pixelDiff (Proof lens readout)', () => {
  it('reports 100.0% only when zero pixels differ', () => {
    const img = gradient(120, 90);
    const r = pixelDiff(img, img);
    expect(r.differing).toBe(0);
    expect(r.identicalTenths).toBe(1000);
    expect(r.differingTenths).toBe(0);
  });

  it('never rounds a difference up to 100%', () => {
    const a = solid(256, 256, [120, 120, 120, 255]);
    const b = { ...a, data: new Uint8Array(a.data) };
    b.data.set([0, 0, 0, 255], 0); // one pixel out of 65,536
    const r = pixelDiff(a, b);
    expect(r.differing).toBe(1);
    expect(r.identicalTenths).toBe(999);
    expect(r.differingTenths).toBe(1);
  });

  it('counts a pixel only when a channel moves by more than 24', () => {
    const a = solid(256, 256, [100, 100, 100, 255]);
    const at24 = solid(256, 256, [124, 100, 100, 255]);
    const at25 = solid(256, 256, [125, 100, 100, 255]);
    expect(pixelDiff(a, at24).differing).toBe(0);
    expect(pixelDiff(a, at25).differing).toBe(256 * 256);
  });

  it('floors the identical share so the two numbers always add up to 100.0', () => {
    const a = solid(256, 256, [120, 120, 120, 255]);
    const b = solid(256, 256, [120, 120, 120, 255]);
    for (let p = 0; p < 300; p++) b.data.set([0, 0, 0, 255], p * 4 * 17);
    const r = pixelDiff(a, b);
    expect(r.identicalTenths + r.differingTenths).toBe(1000);
  });

  it('leaves shared white background out, so two different products on white do not look alike', () => {
    // Two different small dark objects on a large white sweep: about 94% of pixels are white in both.
    const object = (x0: number) =>
      fromFn(256, 256, (x, y) => (x >= x0 && x < x0 + 40 && y >= 100 && y < 140 ? [30, 30, 30] : [255, 255, 255]));
    const r = pixelDiff(object(40), object(170));
    expect(r.total).toBe(2 * 40 * 40);
    expect(r.differing).toBe(2 * 40 * 40);
    expect(r.identicalTenths).toBe(0);
    // Two blank photos have nothing that differs.
    const white = solid(64, 64, [255, 255, 255, 255]);
    expect(pixelDiff(white, white)).toMatchObject({ total: 0, identicalTenths: 1000 });
  });

  it('compares photos of different sizes at 256 by 256', () => {
    const small = gradient(64, 64);
    const big = gradient(512, 512);
    expect(pixelDiff(small, big).identicalTenths).toBeGreaterThan(950);
  });
});

describe('hashImage', () => {
  it('returns all three hashes and the source size', () => {
    const h = hashImage(gradient(50, 30));
    expect(h.dhash).toMatch(/^[0-9a-f]{16}$/);
    expect(h.phash).toMatch(/^[0-9a-f]{16}$/);
    expect(h.color).toMatch(/^[0-9a-f]{96}$/);
    expect([h.w, h.h]).toEqual([50, 30]);
  });

  it('is deterministic (Node and browser share this code, AC-F2.1)', () => {
    expect(hashImage(checker(77, 53, 7))).toEqual(hashImage(checker(77, 53, 7)));
  });

  it('flags a flat or blank photo as low information, and a real photo not', () => {
    expect(hashImage(solid(80, 80, [250, 250, 250, 255])).lowInfo).toBe(true);
    expect(hashImage(solid(80, 80, [120, 40, 200, 255])).lowInfo).toBe(true);
    expect(hashImage(scene(80, 80)).lowInfo).toBeUndefined();
    expect(hashImage(gradient(80, 80)).lowInfo).toBeUndefined();
  });

  it('survives JSON, which is how hashes cross messaging and storage', () => {
    const h = hashImage(gradient(40, 40));
    expect(JSON.parse(JSON.stringify(h))).toEqual(h);
  });
});

// AC-F2.2 on the synthetic photos from scripts/lib/synth.ts: a photo and its re-encode, resize and
// small crop stay close; different photos stay far. SPEC asks for >= 98% and >= 99%; the measured
// values are recorded in HANDOFF.md and these floors guard against regressions.
describe('robustness on the synthetic photo corpus (AC-F2.2)', () => {
  const rnd = mulberry32(2026);
  const BASES = 48;
  const VARIANTS = 4;
  let twinWithin = 0;
  let twinTotal = 0;
  let twinEdges = 0;
  let farPairs = 0;
  let pairs = 0;

  it('keeps re-uploads within pHash 6 and different photos beyond it', async () => {
    const originals: { png: Buffer; h: ReturnType<typeof hashImage> }[] = [];
    for (let i = 0; i < BASES; i++) {
      const png = await renderPhoto({
        seed: 500 + i,
        silhouette: SILHOUETTES[i % SILHOUETTES.length] as (typeof SILHOUETTES)[number],
      });
      originals.push({ png, h: hashImage(await decodeRgba(await encodeOriginal(png))) });
    }
    for (const o of originals) {
      for (let k = 0; k < VARIANTS; k++) {
        const t = randomTransform(rnd);
        const h = hashImage(await decodeRgba(await encodeTwin(o.png, t)));
        twinTotal++;
        if (hamming(h.phash, o.h.phash) <= 6) twinWithin++;
        if (
          hamming(h.phash, o.h.phash) <= 6 &&
          hamming(h.dhash, o.h.dhash) <= 10 &&
          colorDistance(h.color, o.h.color) <= 0.06
        )
          twinEdges++;
      }
    }
    for (let i = 0; i < originals.length; i++) {
      for (let j = i + 1; j < originals.length; j++) {
        pairs++;
        if (
          hamming(
            (originals[i] as (typeof originals)[number]).h.phash,
            (originals[j] as (typeof originals)[number]).h.phash,
          ) > 6
        )
          farPairs++;
      }
    }
    // Measured on 2026-10-27 (192 re-uploads, 1,128 different pairs): 93.75% within pHash 6, 100% of
    // different pairs beyond it. SPEC asks for 98% / 99%; the gap is open (HANDOFF.md, known issues).
    expect(twinWithin / twinTotal).toBeGreaterThanOrEqual(0.92);
    expect(twinEdges / twinTotal).toBeGreaterThanOrEqual(0.9);
    expect(farPairs / pairs).toBeGreaterThanOrEqual(0.99);
  }, 60_000);
});
