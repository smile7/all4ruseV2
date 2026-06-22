/**
 * Generates all PWA and favicon assets into public/.
 * Run once: node scripts/generate-icons.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assets = "/Users/smile/.cursor/projects/Users-smile-Documents-all4ruseV2-all4rusev2/assets";
const publicDir = path.join(root, "public");

const WORDMARK_SRC = path.join(assets, "all4ruse_black-da2966a2-59f3-4cf9-8b0d-8d1401557417.png");
const FAVICON_SRC = path.join(assets, "favicon-67426ee6-f6c2-44dc-9c39-202a1f375013.png");
const OG_SRC = path.join(assets, "og-home-5de6962c-2554-41ce-be3d-e00fdb02430b.png");

/** Creates a square PNG: logo fitted inside (size - 2*padding) on a white background */
async function makeSquareIcon(srcPath, size, paddingRatio = 0.12) {
  const padding = Math.round(size * paddingRatio);
  const inner = size - padding * 2;

  const logoBuffer = await sharp(srcPath)
    .resize(inner, inner, { fit: "inside", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toBuffer();

  const logoMeta = await sharp(logoBuffer).metadata();
  const left = Math.round((size - logoMeta.width) / 2);
  const top = Math.round((size - logoMeta.height) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: logoBuffer, left, top }])
    .png();
}

/** Creates a square PNG from the R favicon icon */
async function makeSquareFavicon(srcPath, size) {
  return sharp(srcPath)
    .resize(size, size, { fit: "cover" })
    .png();
}

async function run() {
  console.log("Generating PWA icons...\n");

  // --- Favicon sizes (use R icon) ---
  console.log("favicon-16x16.png");
  await (await makeSquareFavicon(FAVICON_SRC, 16)).toFile(path.join(publicDir, "favicon-16x16.png"));

  console.log("favicon-32x32.png");
  await (await makeSquareFavicon(FAVICON_SRC, 32)).toFile(path.join(publicDir, "favicon-32x32.png"));

  // For favicon.ico, use the 32x32 PNG (browsers accept PNG-based .ico)
  console.log("favicon.ico");
  await (await makeSquareFavicon(FAVICON_SRC, 32)).toFile(path.join(publicDir, "favicon.ico"));

  // --- Apple touch icon (180x180) — wordmark ---
  console.log("apple-touch-icon.png");
  await (await makeSquareIcon(WORDMARK_SRC, 180)).toFile(path.join(publicDir, "apple-touch-icon.png"));

  // --- Android chrome PWA icons — wordmark ---
  console.log("android-chrome-192x192.png");
  await (await makeSquareIcon(WORDMARK_SRC, 192)).toFile(path.join(publicDir, "android-chrome-192x192.png"));

  console.log("android-chrome-512x512.png");
  await (await makeSquareIcon(WORDMARK_SRC, 512)).toFile(path.join(publicDir, "android-chrome-512x512.png"));

  // --- OG image ---
  console.log("og-home.png");
  await sharp(OG_SRC)
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toFile(path.join(publicDir, "og-home.png"));

  console.log("\nDone. Files written to public/:");
  const files = ["favicon-16x16.png", "favicon-32x32.png", "favicon.ico", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "og-home.png"];
  for (const f of files) {
    const p = path.join(publicDir, f);
    const stat = fs.statSync(p);
    console.log(`  ${f} — ${(stat.size / 1024).toFixed(1)} KB`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
