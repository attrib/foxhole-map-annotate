import sharp from "sharp";

/*
1 Olavi's Wake - MapAirborne1Hex
2 Pari Peak - MapAirborne2Hex
3 Palantine Berm - MapAirborne3Hex
4 Kuura Strand - MapAirborne4Hex
5 The Gutter - MapAirborne5Hex
6 Wresta - MapAirborne6Hex
7 Ónyx - MapAirborne7Hex
8 Lykos Isle - MapAirborne8Hex
9 Tyrant Foothills - MapAirborne9Hex
10 Piper's Enclave - MapAirborne10Hex
*/



(async () => {
  const width = 2048; // Width of each image
  const height = 1776; // Height of each image
  const images = [
    { input: "tools/map/MapBasinSionnachHex.png", top: 0, left: 3 * width },

    { input: "tools/map/MapSpeakingWoodsHex.png", top: height / 2, left: 2.25 * width },
    { input: "tools/map/MapHowlCountyHex.png", top: height / 2, left: 3.75 * width },

    { input: "tools/map/MapKuuraStrandHex.png", top: height, left: 0 * width }, // MapAirborne4Hex
    { input: "tools/map/MapCallumsCapeHex.png", top: height, left: 1.5 * width },
    { input: "tools/map/MapReachingTrailHex.png", top: height, left: 3 * width },
    { input: "tools/map/MapClansheadValleyHex.png", top: height, left: 4.5 * width },

    { input: "tools/map/MapPariPeakHex.png", top: height * 1.5, left: -0.75 * width }, // MapAirborne2Hex
    { input: "tools/map/MapNevishLineHex.png", top: height * 1.5, left: 0.75 * width },
    { input: "tools/map/MapMooringCountyHex.png", top: height * 1.5, left: 2.25 * width },
    { input: "tools/map/MapViperPitHex.png", top: height * 1.5, left: 3.75 * width },
    { input: "tools/map/MapMorgensCrossingHex.png", top: height * 1.5, left: 5.25 * width },

    { input: "tools/map/MapOlavisWakeHex.png", top: height * 2, left: -1.5 * width }, // MapAirborne1Hex
    { input: "tools/map/MapGutterHex.png", top: height * 2, left: 0 * width }, // MapAirborne5Hex
    { input: "tools/map/MapStonecradleHex.png", top: height * 2, left: 1.5 * width },
    { input: "tools/map/MapCallahansPassageHex.png", top: height * 2, left: 3 * width },
    { input: "tools/map/MapWeatheredExpanseHex.png", top: height * 2, left: 4.5 * width },
    { input: "tools/map/MapGodcroftsHex.png", top: height * 2, left: 6 * width },

    { input: "tools/map/MapPalantineBermHex.png", top: height * 2.5, left: -0.75 * width }, // MapAirborne3Hex
    { input: "tools/map/MapFarranacCoastHex.png", top: height * 2.5, left: 0.75 * width },
    { input: "tools/map/MapLinnMercyHex.png", top: height * 2.5, left: 2.25 * width },
    { input: "tools/map/MapMarbanHollowHex.png", top: height * 2.5, left: 3.75 * width },
    { input: "tools/map/MapStlicanShelfHex.png", top: height * 2.5, left: 5.25 * width },
    { input: "tools/map/MapLykosIsleHex.png", top: height * 2.5, left: 6.75 * width }, // MapAirborne8Hex

    { input: "tools/map/MapFishermansRowHex.png", top: height * 3, left: 0 * width },
    { input: "tools/map/MapKingsCageHex.png", top: height * 3, left: 1.5 * width },
    { input: "tools/map/MapDeadlandsHex.png", top: height * 3, left: 3 * width },
    { input: "tools/map/MapClahstraHex.png", top: height * 3, left: 4.5 * width },
    { input: "tools/map/MapTempestIslandHex.png", top: height * 3, left: 6 * width },

    { input: "tools/map/MapOarbreakerHex.png", top: height * 3.5, left: -0.75 * width },
    { input: "tools/map/MapWestgateHex.png", top: height * 3.5, left: 0.75 * width },
    { input: "tools/map/MapLochMorHex.png", top: height * 3.5, left: 2.25 * width },
    { input: "tools/map/MapDrownedValeHex.png", top: height * 3.5, left: 3.75 * width },
    { input: "tools/map/MapEndlessShoreHex.png", top: height * 3.5, left: 5.25 * width },
    { input: "tools/map/MapTheFingersHex.png", top: height * 3.5, left: 6.75 * width },

    { input: "tools/map/MapStemaLAndingHex.png", top: height * 4, left: 0 * width },
    { input: "tools/map/MapSableportHex.png", top: height * 4, left: 1.5 * width },
    { input: "tools/map/MapUmbralWildwoodHex.png", top: height * 4, left: 3 * width },
    { input: "tools/map/MapAllodsBightHex.png", top: height * 4, left: 4.5 * width },
    { input: "tools/map/MapWrestaHex.png", top: height * 4, left: 6 * width }, // MapAirborne6Hex
    { input: "tools/map/MapPipersEnclaveHex.png", top: height * 4, left: 7.5 * width }, // MapAirborne10Hex

    { input: "tools/map/MapOriginHex.png", top: height * 4.5, left: 0.75 * width },
    { input: "tools/map/MapHeartlandsHex.png", top: height * 4.5, left: 2.25 * width },
    { input: "tools/map/MapShackledChasmHex.png", top: height * 4.5, left: 3.75 * width },
    { input: "tools/map/MapReaversPassHex.png", top: height * 4.5, left: 5.25 * width },
    { input: "tools/map/MapTyrantFoothillsHex.png", top: height * 4.5, left: 6.75 * width }, // MapAirborne9Hex

    { input: "tools/map/MapAshFieldsHex.png", top: height * 5, left: 1.5 * width },
    { input: "tools/map/MapGreatMarchHex.png", top: height * 5, left: 3 * width },
    { input: "tools/map/MapTerminusHex.png", top: height * 5, left: 4.5 * width },
    { input: "tools/map/MapOnyxHex.png", top: height * 5, left: 6 * width }, // MapAirborne7Hex

    { input: "tools/map/MapRedRiverHex.png", top: height * 5.5, left: 2.25 * width },
    { input: "tools/map/MapAcrithiaHex.png", top: height * 5.5, left: 3.75 * width },

    { input: "tools/map/MapKalokaiHex.png", top: height * 6, left: 3 * width },
  ];
  const outputPath = "tools/entiremap.png";
  try {
    // move everything 1.5 to the west because of new maps
    for (const img of images) {
      img.left += 1.5 * width;
    }
    const maxLeft = Math.max(...images.map(i => i.left));
    const maxTop = Math.max(...images.map(i => i.top));
    const stitchedImage = await sharp({
      create: {
        width: maxLeft + width,
        height: maxTop + height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    });

    for (const image of images) {
      // image.blend = 'atop'
      // image.premultiplied = true
      // image.raw = { width, height, channels: 4 }
      // stitchedImage.composite([image]);
      await sharp(image.input).resize({ width: width, height: height }).toFile(image.input + 'scaled.png');
      image.input = image.input + 'scaled.png';
    }
    console.log(images);

    await stitchedImage.composite(images).toFile(outputPath); // sharpen
    // await stitchedImage.toFile(outputPath);

    console.log(`Stitched image saved to: ${outputPath}`);
  } catch (error) {
    console.error(error.message);
  }
})();
