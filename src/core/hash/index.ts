import type { ImageHashes } from '../types';
import { colorSignature } from './color';
import { dhash } from './dhash';
import { LOW_INFO_LUMA_STD } from '../constants';
import { phashFromLuma, phashLuma } from './phash';
import { assertRgba, type RgbaImage } from './resample';

/** Standard deviation of a luma signal (0 to 255). */
function spread(luma: Float64Array): number {
  let sum = 0;
  for (const v of luma) sum += v;
  const mean = sum / luma.length;
  let sq = 0;
  for (const v of luma) sq += (v - mean) ** 2;
  return Math.sqrt(sq / luma.length);
}

/** Every hash for one decoded thumbnail. Same pixels in, same hashes out, in Node or a browser. */
export function hashImage(img: RgbaImage): ImageHashes {
  assertRgba(img);
  // pHash and the low-information check share one 32 × 32 resample.
  const luma = phashLuma(img);
  const hashes: ImageHashes = {
    dhash: dhash(img),
    phash: phashFromLuma(luma),
    color: colorSignature(img),
    w: img.width,
    h: img.height,
  };
  if (spread(luma) < LOW_INFO_LUMA_STD) hashes.lowInfo = true;
  return hashes;
}
