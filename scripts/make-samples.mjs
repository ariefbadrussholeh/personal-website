// Generates abstract placeholder images into public/samples (dark, blue accent).
import sharp from "sharp";
import fs from "node:fs";

fs.mkdirSync("public/samples", { recursive: true });

function art(w, h, seed) {
  const r = (n) => {
    const x = Math.sin(seed * 999 + n * 77.7) * 10000;
    return x - Math.floor(x);
  };
  const glows = Array.from({ length: 3 }, (_, i) => {
    const cx = Math.round(r(i) * w), cy = Math.round(r(i + 5) * h);
    const rad = Math.round((0.35 + r(i + 9) * 0.5) * Math.max(w, h));
    const op = (0.18 + r(i + 3) * 0.3).toFixed(2);
    const hue = i === 0 ? "#2b6af0" : i === 1 ? "#4a82ff" : "#1c3d8f";
    return `<radialGradient id="g${i}" cx="${cx}" cy="${cy}" r="${rad}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${hue}" stop-opacity="${op}"/><stop offset="1" stop-color="${hue}" stop-opacity="0"/></radialGradient>`;
  });
  const step = Math.round(Math.min(w, h) / 9);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    ${glows.join("")}
    <pattern id="grid" width="${step}" height="${step}" patternUnits="userSpaceOnUse">
      <path d="M ${step} 0 L 0 0 0 ${step}" fill="none" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1"/>
    </pattern>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1016"/><stop offset="1" stop-color="#08090c"/></linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#base)"/>
  <rect width="100%" height="100%" fill="url(#g0)"/>
  <rect width="100%" height="100%" fill="url(#g1)"/>
  <rect width="100%" height="100%" fill="url(#g2)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
</svg>`;
}

const files = {
  "portrait.jpg": [1000, 1250, 1],
  "project-1.jpg": [1600, 1000, 2],
  "project-2.jpg": [1600, 1000, 3],
  "project-3.jpg": [1600, 1000, 4],
  "project-4.jpg": [1600, 1000, 5],
  "post-1.jpg": [1600, 900, 6],
  "post-2.jpg": [1600, 900, 7],
  "photo-1.jpg": [1200, 1500, 8],
  "photo-2.jpg": [1500, 1000, 9],
  "photo-3.jpg": [1200, 1200, 10],
  "photo-4.jpg": [1200, 1600, 11],
  "photo-5.jpg": [1600, 1067, 12],
  "photo-6.jpg": [1200, 1500, 13],
};

for (const [name, [w, h, seed]] of Object.entries(files)) {
  await sharp(Buffer.from(art(w, h, seed))).jpeg({ quality: 82 }).toFile(`public/samples/${name}`);
}
console.log("generated", Object.keys(files).length, "images");
