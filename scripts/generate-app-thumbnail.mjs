import sharp from "sharp";

const w = 1200;
const h = Math.round(w / 1.91);

const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070313"/>
      <stop offset="50%" stop-color="#1a0a24"/>
      <stop offset="100%" stop-color="#0c1628"/>
    </linearGradient>
    <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="50%" stop-color="#e879f9"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="980" cy="120" r="180" fill="#22d3ee" opacity="0.12"/>
  <circle cx="1050" cy="380" r="220" fill="#e879f9" opacity="0.15"/>
  <circle cx="200" cy="320" r="140" fill="#a855f7" opacity="0.2"/>
  <text x="64" y="200" fill="#f5d0fe" font-family="Arial,sans-serif" font-size="72" font-weight="800">Base OS</text>
  <text x="64" y="270" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="32">Your Base command center</text>
  <text x="64" y="330" fill="#94a3b8" font-family="Arial,sans-serif" font-size="22">Tips · Score · Analytics · Launch Token</text>
  <rect x="64" y="380" width="420" height="8" rx="4" fill="url(#acc)" opacity="0.9"/>
  <rect x="720" y="80" width="440" height="468" rx="24" fill="#000000" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2"/>
  <rect x="748" y="108" width="384" height="48" rx="12" fill="#22d3ee" fill-opacity="0.2"/>
  <text x="768" y="142" fill="#67e8f9" font-family="Arial,sans-serif" font-size="18" font-weight="700">Onchain score · Analytics · Home</text>
  <rect x="748" y="176" width="180" height="72" rx="14" fill="#f472b6" fill-opacity="0.15"/>
  <rect x="944" y="176" width="188" height="72" rx="14" fill="#34d399" fill-opacity="0.12"/>
  <rect x="748" y="268" width="384" height="100" rx="14" fill="#ffffff" fill-opacity="0.06"/>
  <rect x="748" y="388" width="384" height="56" rx="14" fill="url(#acc)" opacity="0.35"/>
  <text x="768" y="424" fill="#ffffff" font-family="Arial,sans-serif" font-size="20" font-weight="700">Launch Token on Base</text>
</svg>`;

const out = "public/app-thumbnail-base-os.png";
const info = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
const { size } = await import("node:fs/promises").then((fs) => fs.stat(out));
console.log(`${out}: ${w}x${h} (${(size / 1024).toFixed(1)} KB)`);
