import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.join(import.meta.dirname, "..");
const svgPath = path.join(root, "public", "app-icon-base-os.svg");
const outPath = path.join(root, "docs", "base-dev-assets", "app-icon-base-os-512.png");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const svg = fs.readFileSync(svgPath);

await sharp(svg, { density: 300 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(outPath);

const { size } = fs.statSync(outPath);
console.log(`${outPath} (512×512, ${(size / 1024).toFixed(1)} KB)`);
