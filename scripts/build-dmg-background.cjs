const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "public/marketing/atmosphere/dmg-installer-background.png");
const outputDirectory = path.join(projectRoot, "build");
const outputPath = path.join(outputDirectory, "dmg-background.png");
const retinaOutputPath = path.join(outputDirectory, "dmg-background@2x.png");
const width = 540;
const height = 380;

async function createDmgBackground() {
  await fs.mkdir(outputDirectory, { recursive: true });

  // Finder treats the regular artwork as the physical DMG window size. Supply
  // paired 1x/2x images so Retina Macs render the exact same composition
  // instead of treating the source art as an oversized window.
  const retinaArtwork = await sharp(sourcePath)
    .resize(width * 2, height * 2, { fit: "cover", position: "centre" })
    .withMetadata({ density: 144 })
    .png()
    .toBuffer();

  await fs.writeFile(retinaOutputPath, retinaArtwork);
  await sharp(retinaArtwork)
    .resize(width, height)
    .withMetadata({ density: 72 })
    .png()
    .toFile(outputPath);
}

createDmgBackground().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
