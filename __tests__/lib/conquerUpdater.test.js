//@ts-check
import fs from "node:fs";
import path from "node:path";

import warApi from "../../lib/warapi.js";
import * as conquerUpdater from "../../lib/conquerUpdater.js";
import { test, vi, expect } from "vitest";

vi.mock("../../lib/config.js");
vi.mock("../../lib/warapi.js");
vi.mocked(warApi.maps).mockResolvedValue(["TheFingersHex"]);
vi.mocked(warApi.getTeam).mockImplementation((teamId) => {
  if (teamId === "NONE") {
    return "";
  }
  if (teamId === "COLONIALS") {
    return "Colonial";
  }
  if (teamId === "WARDENS") {
    return "Warden";
  }
})
let fakeDataCounter = 1
const mockedData = function(hexId) {
  if (fs.existsSync(path.resolve(`__tests__/mockupData/${hexId}/${fakeDataCounter}.json`))) {
    const content = fs.readFileSync(path.resolve(`__tests__/mockupData/${hexId}/${fakeDataCounter}.json`), 'utf8')
    return JSON.parse(content)
  }
  return null
}
vi.mocked(warApi.dynamicMap).mockImplementation(mockedData);
vi.mocked(warApi.dynamicMapETag).mockImplementation(mockedData);

const expectedDeactivatedRegions = [
  "TerminusHex",
  "AllodsBightHex",
  "EndlessShoreHex",
  "WeatheredExpanseHex",
  "ClansheadValleyHex",
  "MorgensCrossingHex",
  "GodcroftsHex",
  "TempestIslandHex",
  "CallahansPassageHex",
  "ReachingTrailHex",
  "BasinSionnachHex",
  "ViperPitHex",
  "HowlCountyHex",
  "AcrithiaHex",
  "ShackledChasmHex",
  "DrownedValeHex",
  "MarbanHollow",
  "FarranacCoastHex",
  "NevishLineHex",
  "CallumsCapeHex",
  "MooringCountyHex",
  "SpeakingWoodsHex",
  "AshFieldsHex",
  "SableportHex",
  "KingsCageHex",
  "StonecradleHex",
  "WestgateHex",
  "OriginHex",
  "RedRiverHex",
  "HeartlandsHex",
  "LochMorHex",
  "LinnMercyHex",
  "KalokaiHex",
  "GreatMarchHex",
  "UmbralWildwoodHex",
  "DeadLandsHex",
  "FishermansRowHex",
  "OarbreakerHex",
  "StlicanShelfHex",
  "ReaversPassHex",
  "ClahstraHex",
  "StemaLandingHex",
]

test("getWarFeaturesInit", () => {
  const warFeatures = conquerUpdater.getWarFeatures();
  expect(warFeatures).toStrictEqual({
    features: [],
    deactivatedRegions: undefined,
    version: "",
  });
});

//
// console.log(warApi)
// console.log(config)

test("updateMapTests", () => {
  fakeDataCounter = 1
  return conquerUpdater
    .updateMap()
    .then((data) => {
      expect(data).not.toBeNull();
      const featureIds = Object.keys(data.features);
      expect(featureIds.length).toBe(1);
      expect(data.features[featureIds]).toEqual({
        team: "Colonial",
        icon: "MapIconRelicBase",
        flags: 8,
        lastChange: 1701336872072,
        lastTeam: "",
      });
      const warFeatures = conquerUpdater.getWarFeatures();
      expect(warFeatures).toEqual(
        expect.objectContaining({
          deactivatedRegions: expectedDeactivatedRegions,
        })
      );
      expect(warFeatures.features).toEqual([
        expect.objectContaining({
          geometry: {
            coordinates: [14104.78287, -8136.76743825],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconSalvageColor",
            notes: "Salvage Field",
            team: "",
            time: "",
            type: "field",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
        expect.objectContaining({
          geometry: {
            coordinates: [13243.34171, -7755.47262375],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconRelicBase",
            notes: "Fort Barley Small Relic Base",
            team: "",
            time: "",
            type: "town",
            voronoi: "2abff407-2f07-48d6-acec-84876a0994d3",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
      ]);
      warApi.eTags["TheFingersHex"] = 10;
      fakeDataCounter = 99 // null, same etag no change
      return conquerUpdater.updateMap();
    })
    .then((data) => {
      expect(data).toBeNull();
      const warFeatures = conquerUpdater.getWarFeatures();
      expect(warFeatures).toEqual(
        expect.objectContaining({
          deactivatedRegions: expectedDeactivatedRegions,
        })
      );
      expect(warFeatures.features).toEqual([
        expect.objectContaining({
          geometry: {
            coordinates: [14104.78287, -8136.76743825],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconSalvageColor",
            notes: "Salvage Field",
            team: "",
            time: "",
            type: "field",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
        expect.objectContaining({
          geometry: {
            coordinates: [13243.34171, -7755.47262375],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconRelicBase",
            notes: "Fort Barley Small Relic Base",
            team: "",
            time: "",
            type: "town",
            voronoi: "2abff407-2f07-48d6-acec-84876a0994d3",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
      ]);
      warApi.eTags["TheFingersHex"] = 10;
      fakeDataCounter = 2
      return conquerUpdater.updateMap();
    })
    .then((data) => {
      expect(data).not.toBeNull();
      const featureIds = Object.keys(data.features);
      expect(featureIds.length).toBe(1);
      expect(data.features[featureIds]).toEqual({
        team: "",
        icon: "MapIconRelicBase",
        flags: 8,
        lastChange: 1701336872080,
        lastTeam: "Colonial",
      });
      const warFeatures = conquerUpdater.getWarFeatures();
      expect(warFeatures).toEqual(
        expect.objectContaining({
          deactivatedRegions: expectedDeactivatedRegions,
        })
      );
      expect(warFeatures.features).toEqual([
        expect.objectContaining({
          geometry: {
            coordinates: [14104.78287, -8136.76743825],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconSalvageColor",
            notes: "Salvage Field",
            team: "",
            time: "",
            type: "field",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
        expect.objectContaining({
          geometry: {
            coordinates: [13243.34171, -7755.47262375],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconRelicBase",
            notes: "Fort Barley Small Relic Base",
            team: "",
            time: "",
            type: "town",
            voronoi: "2abff407-2f07-48d6-acec-84876a0994d3",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
      ]);
      warApi.eTags["TheFingersHex"] = 11;
      fakeDataCounter = 3
      return conquerUpdater.updateMap();
    })
    .then((data) => {
      expect(data).not.toBeNull();
      expect(Object.keys(data.features).length).toBe(2);
      expect(Object.values(data.features)).toEqual([
        expect.objectContaining({
          team: "Warden",
          icon: "MapIconRelicBase",
          flags: 8,
          lastChange: 1701336872090,
          lastTeam: "Colonial",
        }),
        expect.objectContaining({
          team: "Warden",
          icon: "MapIconStormCannon",
          type: "stormCannon",
          notes: "Storm Cannon",
          coordinates: [13448.34171, -7932.97262375],
          region: "TheFingersHex",
          lastChange: 1701336872090,
          lastTeam: "Warden",
        }),
      ]);
      const warFeatures = conquerUpdater.getWarFeatures();
      expect(warFeatures).toEqual(
        expect.objectContaining({
          deactivatedRegions: expectedDeactivatedRegions,
        })
      );
      expect(warFeatures.features).toEqual([
        expect.objectContaining({
          geometry: {
            coordinates: [14104.78287, -8136.76743825],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconSalvageColor",
            notes: "Salvage Field",
            team: "",
            time: "",
            type: "field",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
        expect.objectContaining({
          geometry: {
            coordinates: [13243.34171, -7755.47262375],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconRelicBase",
            notes: "Fort Barley Small Relic Base",
            team: "",
            time: "",
            type: "town",
            voronoi: "2abff407-2f07-48d6-acec-84876a0994d3",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
      ]);
      warApi.eTags["TheFingersHex"] = 12;
      fakeDataCounter = 4
      return conquerUpdater.updateMap();
    })
    .then((data) => {
      expect(data).not.toBeNull();
      expect(Object.keys(data.features).length).toBe(2);
      expect(Object.values(data.features)).toEqual([
        expect.objectContaining({
          team: "",
          icon: "MapIconRelicBase",
          flags: 8,
          lastChange: 1701336872100,
          lastTeam: "Warden",
        }),
        expect.objectContaining({
          team: "Warden",
          icon: "MapIconStormCannon",
          type: "stormCannon",
          notes: "Storm Cannon",
          coordinates: [13450.39171, -7932.97262375],
          region: "TheFingersHex",
          lastChange: 1701336872100,
          lastTeam: "Warden",
        }),
      ]);
      const warFeatures = conquerUpdater.getWarFeatures();
      expect(warFeatures).toEqual(
        expect.objectContaining({
          deactivatedRegions: expectedDeactivatedRegions,
        })
      );
      expect(warFeatures.features).toEqual([
        expect.objectContaining({
          geometry: {
            coordinates: [14104.78287, -8136.76743825],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconSalvageColor",
            notes: "Salvage Field",
            team: "",
            time: "",
            type: "field",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
        expect.objectContaining({
          geometry: {
            coordinates: [13243.34171, -7755.47262375],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconRelicBase",
            notes: "Fort Barley Small Relic Base",
            team: "",
            time: "",
            type: "town",
            voronoi: "2abff407-2f07-48d6-acec-84876a0994d3",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
      ]);
      warApi.eTags["TheFingersHex"] = 13;
      fakeDataCounter = 5
      return conquerUpdater.updateMap();
    })
    .then((data) => {
      expect(data).not.toBeNull();
      expect(Object.keys(data.features).length).toBe(3);
      expect(Object.values(data.features)).toEqual([
        expect.objectContaining({
          team: "Colonial",
          icon: "MapIconRelicBase",
          flags: 8,
          lastChange: 1701336872110,
          lastTeam: "Warden",
        }),
        expect.objectContaining({
          team: "Colonial",
          icon: "MapIconStormCannon",
          type: "stormCannon",
          notes: "Storm Cannon",
          coordinates: [13448.34171, -7932.97262375],
          region: "TheFingersHex",
          lastChange: 1701336872110,
          lastTeam: "Colonial",
        }),
        expect.objectContaining({
          team: "Warden",
          icon: "MapIconStormCannon",
          type: "stormCannon",
          notes: "Storm Cannon",
          coordinates: [13448.34171, -7932.97262375],
          region: "TheFingersHex",
          lastChange: 1701336872090,
          lastTeam: "Warden",
          destroyed: true,
        }),
      ]);
      const warFeatures = conquerUpdater.getWarFeatures();
      expect(warFeatures).toEqual(
        expect.objectContaining({
          deactivatedRegions: expectedDeactivatedRegions,
        })
      );
      expect(warFeatures.features).toEqual([
        expect.objectContaining({
          geometry: {
            coordinates: [14104.78287, -8136.76743825],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconSalvageColor",
            notes: "Salvage Field",
            team: "",
            time: "",
            type: "field",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
        expect.objectContaining({
          geometry: {
            coordinates: [13243.34171, -7755.47262375],
            type: "Point",
          },
          properties: expect.objectContaining({
            icon: "MapIconRelicBase",
            notes: "Fort Barley Small Relic Base",
            team: "",
            time: "",
            type: "town",
            voronoi: "2abff407-2f07-48d6-acec-84876a0994d3",
            user: "World",
            region: "TheFingersHex",
          }),
          type: "Feature",
        }),
      ]);
      warApi.eTags["TheFingersHex"] = 14;
      // warApi.dynamicMap.mockResolvedValue(data5)
      // warApi.dynamicMapETag.mockResolvedValue(data5)
      // return conquerUpdater.updateMap()
    });
});
