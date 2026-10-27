import type { ImageHashes } from '../types';
import { colorSignature } from './color';
import { dhash } from './dhash';
import { phash } from './phash';
import { assertRgba, type RgbaImage } from './resample';

/** Every hash for one decoded thumbnail. Same pixels in, same hashes out, in Node or a browser. */
export function hashImage(img: RgbaImage): ImageHashes {
  assertRgba(img);
  return { dhash: dhash(img), phash: phash(img), color: colorSignature(img), w: img.width, h: img.height };
}
