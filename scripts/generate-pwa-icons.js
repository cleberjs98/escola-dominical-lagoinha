const fs = require("fs");
const path = require("path");
const { deflateSync } = require("zlib");

// Simple PNG encoder (RGBA, 8-bit) without external deps.
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter type 0
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(raw);
  const chunks = [
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ];

  return Buffer.concat([signature, ...chunks]);
}

function createShieldIcon(size) {
  const w = size;
  const h = size;
  const data = Buffer.alloc(w * h * 4);
  const bg = { r: 122, g: 20, b: 34, a: 255 }; // #7A1422
  const fg = { r: 255, g: 255, b: 255, a: 255 }; // white

  const cx = w / 2;
  const top = h * 0.16;
  const bodyHeight = h * 0.66;
  const tipHeight = h * 0.12;
  const shieldHalfW = w * 0.32;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      data[idx] = bg.r;
      data[idx + 1] = bg.g;
      data[idx + 2] = bg.b;
      data[idx + 3] = bg.a;

      const isAboveTop = y < top;
      const isBelowTip = y > top + bodyHeight + tipHeight;
      if (isAboveTop || isBelowTip) continue;

      const t = Math.min(Math.max((y - top) / bodyHeight, 0), 1);
      const taper = 1 - 0.28 * t; // narrow towards bottom
      const halfWidth = shieldHalfW * taper;
      const dx = Math.abs(x - cx);

      let inside = dx <= halfWidth;

      // tip section
      if (y >= top + bodyHeight) {
        const tipT = Math.min((y - (top + bodyHeight)) / tipHeight, 1);
        const tipWidth = shieldHalfW * (1 - tipT);
        inside = dx <= tipWidth;
      }

      if (inside) {
        data[idx] = fg.r;
        data[idx + 1] = fg.g;
        data[idx + 2] = fg.b;
        data[idx + 3] = fg.a;
      }
    }
  }

  return encodePng(w, h, data);
}

function writeIcon(size, filename) {
  const buffer = createShieldIcon(size);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

function main() {
  const root = path.resolve(__dirname, "..");
  const outDir = path.join(root, "assets", "images");
  fs.mkdirSync(outDir, { recursive: true });
  writeIcon(192, path.join(outDir, "pwa-icon-192.png"));
  writeIcon(512, path.join(outDir, "pwa-icon-512.png"));
}

if (require.main === module) {
  main();
}
