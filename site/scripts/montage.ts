// Dev helper: tiles several images side by side into one PNG. Usage: tsx scripts/montage.ts out.png a.png b.png ...
import sharp from 'sharp';
const [out, ...files] = process.argv.slice(2);
const bufs = await Promise.all(
  files.map((f) =>
    sharp(f)
      .toBuffer()
      .then(async (b) => ({ b, m: await sharp(b).metadata() })),
  ),
);
const H = Math.max(...bufs.map((x) => x.m.height!));
let left = 0;
const comp = bufs.map((x) => {
  const c = { input: x.b, left, top: 0 };
  left += x.m.width! + 8;
  return c;
});
await sharp({ create: { width: left, height: H, channels: 3, background: '#888' } })
  .composite(comp)
  .png()
  .toFile(out!);
