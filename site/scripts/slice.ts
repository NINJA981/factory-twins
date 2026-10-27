// Dev helper: cut a tall screenshot into viewport-sized slices so each can be inspected.
import sharp from 'sharp';
const [file, outPrefix, h = '1100'] = process.argv.slice(2);
const meta = await sharp(file!).metadata();
const H = Number(h);
for (let i = 0, y = 0; y < (meta.height ?? 0); i++, y += H) {
  await sharp(file!).extract({ left: 0, top: y, width: meta.width!, height: Math.min(H, meta.height! - y) }).toFile(`${outPrefix}-${String(i).padStart(2, '0')}.png`);
}
