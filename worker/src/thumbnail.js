const sharp = require("sharp");

// 300x300 square crop, auto-rotated, saved as JPEG
function makeThumbnail(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 300, height: 300, fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
}

module.exports = { makeThumbnail };