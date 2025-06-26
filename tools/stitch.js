import sharp from "sharp";

(async () => {
  const width = 2048; // Width of each image
  const height = 1776; // Height of each image
  const images = [
    { input: "tools/map/MapBasinSionnachHex.png", top: 0, left: 3 * width },

    { input: "tools/map/MapSpeakingWoodsHex.png", top: height / 2, left: 2.25 * width },
    { input: "tools/map/MapHowlCountyHex.png", top: height / 2, left: 3.75 * width },

    { input: "tools/map/MapCallumsCapeHex.png", top: height, left: 1.5 * width },
    { input: "tools/map/MapReachingTrailHex.png", top: height, left: 3 * width },
    { input: "tools/map/MapClansheadValleyHex.png", top: height, left: 4.5 * width },

    { input: "tools/map/MapNevishLineHex.png", top: height * 1.5, left: 0.75 * width },
    { input: "tools/map/MapMooringCountyHex.png", top: height * 1.5, left: 2.25 * width },
    { input: "tools/map/MapViperPitHex.png", top: height * 1.5, left: 3.75 * width },
    { input: "tools/map/MapMorgensCrossingHex.png", top: height * 1.5, left: 5.25 * width },

    { input: "tools/map/MapOarbreakerHex.png", top: height * 2, left: 0 * width },
    { input: "tools/map/MapStonecradleHex.png", top: height * 2, left: 1.5 * width },
    { input: "tools/map/MapCallahansPassageHex.png", top: height * 2, left: 3 * width },
    { input: "tools/map/MapWeatheredExpanseHex.png", top: height * 2, left: 4.5 * width },
    { input: "tools/map/MapGodcroftsHex.png", top: height * 2, left: 6 * width },

    { input: "tools/map/MapFarranacCoastHex.png", top: height * 2.5, left: 0.75 * width },
    { input: "tools/map/MapLinnMercyHex.png", top: height * 2.5, left: 2.25 * width },
    { input: "tools/map/MapMarbanHollow.png", top: height * 2.5, left: 3.75 * width },
    { input: "tools/map/MapStlicanShelfHex.png", top: height * 2.5, left: 5.25 * width },

    { input: "tools/map/MapFishermansRowHex.png", top: height * 3, left: 0 * width },
    { input: "tools/map/MapKingsCageHex.png", top: height * 3, left: 1.5 * width },
    { input: "tools/map/MapDeadlandsHex.png", top: height * 3, left: 3 * width },
    { input: "tools/map/MapClahstraHexMap.png", top: height * 3, left: 4.5 * width },
    { input: "tools/map/MapTempestIslandHex.png", top: height * 3, left: 6 * width },

    { input: "tools/map/MapWestgateHex.png", top: height * 3.5, left: 0.75 * width },
    { input: "tools/map/MapLochMorHex.png", top: height * 3.5, left: 2.25 * width },
    { input: "tools/map/MapDrownedValeHex.png", top: height * 3.5, left: 3.75 * width },
    { input: "tools/map/MapEndlessShoreHex.png", top: height * 3.5, left: 5.25 * width },

    { input: "tools/map/MapStemaLAndingHex.png", top: height * 4, left: 0 * width },
    { input: "tools/map/MapSableportHex.png", top: height * 4, left: 1.5 * width },
    { input: "tools/map/MapUmbralWildwoodHex.png", top: height * 4, left: 3 * width },
    { input: "tools/map/MapAllodsBightHex.png", top: height * 4, left: 4.5 * width },
    { input: "tools/map/MapTheFingersHex.png", top: height * 4, left: 6 * width },

    { input: "tools/map/MapOriginHex.png", top: height * 4.5, left: 0.75 * width },
    { input: "tools/map/MapHeartlandsHex.png", top: height * 4.5, left: 2.25 * width },
    { input: "tools/map/MapShackledChasmHex.png", top: height * 4.5, left: 3.75 * width },
    { input: "tools/map/MapReaversPassHex.png", top: height * 4.5, left: 5.25 * width },

    { input: "tools/map/MapAshFieldsHex.png", top: height * 5, left: 1.5 * width },
    { input: "tools/map/MapGreatMarchHex.png", top: height * 5, left: 3 * width },
    { input: "tools/map/MapTerminusHex.png", top: height * 5, left: 4.5 * width },

    { input: "tools/map/MapRedRiverHex.png", top: height * 5.5, left: 2.25 * width },
    { input: "tools/map/MapAcrithiaHex.png", top: height * 5.5, left: 3.75 * width },

    { input: "tools/map/MapKalokaiHex.png", top: height * 6, left: 3 * width },
  ];
  const outputPath = "tools/entiremap.png";
  try {
    const stitchedImage = await sharp({
      create: {
        width: 4 * width + 4 * 0.75 * width,
        height: 7 * height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    });

    for (const image of images) {
      // image.blend = 'atop'
      // image.premultiplied = true
      // image.raw = { width, height, channels: 4 }
      // stitchedImage.composite([image]);
    }
    console.log(images);

    await stitchedImage.composite(images).toFile(outputPath); // sharpen
    // await stitchedImage.toFile(outputPath);

    console.log(`Stitched image saved to: ${outputPath}`);
  } catch (error) {
    console.error(error.message);
  }
})();
