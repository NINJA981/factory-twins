import type { ImageHashes } from '../types';
import { colorSignature } from './color';
import { dhash } from './dhash';
import { phash } from './phash';
import { LOW_INFO_LUMA_STD } from '../constants';
import { assertRgba, resampleSquare, toLuma, type RgbaImage } from './resample';

/** Standard deviation of the photo's 32 × 32 luma (letterboxed onto white like every hash). */
export function lumaSpread(img: RgbaImage): number {
  const luma = toLuma(resampleSquare(img, 32, 32));
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
  const hashes: ImageHashes = {
    dhash: dhash(img),
    phash: phash(img),
    color: colorSignature(img),
    w: img.width,
    h: img.height,
  };
  if (lumaSpread(img) < LOW_INFO_LUMA_STD) hashes.lowInfo = true;
  return hashes;
}
