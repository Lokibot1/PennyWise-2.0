const { Jimp } = require('jimp');
const path = require('path');

const INPUT  = path.join(__dirname, '../assets/images/owlpennywise.jpg');
const OUTPUT = path.join(__dirname, '../assets/images/owlpennywise.png');

const TOLERANCE = 80;

function isGreen(r, g, b) {
  return g > 100 && g - r > TOLERANCE && g - b > TOLERANCE;
}

function hasOpaqueRow(data, width, row) {
  for (let x = 0; x < width; x++) {
    if (data[((row * width) + x) * 4 + 3] > 10) return true;
  }
  return false;
}

function hasOpaqueCol(data, width, height, col) {
  for (let y = 0; y < height; y++) {
    if (data[((y * width) + col) * 4 + 3] > 10) return true;
  }
  return false;
}

async function main() {
  const img = await Jimp.read(INPUT);
  const { width, height, data } = img.bitmap;

  // Remove green background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (isGreen(r, g, b)) data[idx + 3] = 0;
    }
  }

  // Find tight bounding box on all 4 sides
  let top = 0, bottom = height - 1, left = 0, right = width - 1;
  while (top < height    && !hasOpaqueRow(data, width, top))           top++;
  while (bottom > top    && !hasOpaqueRow(data, width, bottom))        bottom--;
  while (left < width    && !hasOpaqueCol(data, width, height, left))  left++;
  while (right > left    && !hasOpaqueCol(data, width, height, right)) right--;

  // Crop to tight bounding box — no transparent padding on any side
  img.crop({ x: left, y: top, w: right - left + 1, h: bottom - top + 1 });

  // Flip horizontally so owl faces right
  img.flip({ horizontal: true, vertical: false });

  await img.write(OUTPUT);
  console.log(`Done! Cropped to ${right-left+1}x${bottom-top+1} → saved to ${OUTPUT}`);
}

main().catch(console.error);
