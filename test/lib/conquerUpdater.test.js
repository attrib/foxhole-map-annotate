//@ts-check
import fs from "node:fs";
import path from "node:path";

import warApi from "../../lib/warapi.js";
import * as conquerUpdater from "../../lib/conquerUpdater.js";
import { test, vi, expect } from "vitest";

vi.mock("../../lib/config.js");
let fakeDataCounter = 1
global.fetch = vi.fn((url) => {
  const createResponse = (data) => {
    return Promise.resolve({
      json: () => Promise.resolve(data),
      ok: true,
      headers: {
        get: () => fakeDataCounter.toString(),
      },
    })
  }
  switch (url) {
    case "https://war-service-dev.foxholeservices.com/api/worldconquest/maps":
      return createResponse(["TheFingersHex"])

    case "https://war-service-dev.foxholeservices.com/api/worldconquest/maps/TheFingersHex/dynamic/public":
      const hexId = 'TheFingersHex'
      if (fs.existsSync(path.resolve(`test/mockupData/${hexId}/${fakeDataCounter}.json`))) {
        const content = fs.readFileSync(path.resolve(`test/mockupData/${hexId}/${fakeDataCounter}.json`), 'utf8')
        return createResponse(JSON.parse(content))
      }
      return createResponse(null)

    default:
      return Promise.reject('no mockup data for ' + url + ' returning null')
  }
});

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
    deactivatedRegions: null,
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
            coordinates: [14083.2964644, -8137.9299931099995],
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
            coordinates: [13223.5361652, -7756.20555065],
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
            coordinates: [14083.2964644, -8137.9299931099995],
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
            coordinates: [13223.5361652, -7756.20555065],
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
            coordinates: [14083.2964644, -8137.9299931099995],
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
            coordinates: [13223.5361652, -7756.20555065],
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
          coordinates: [13428.1361652, -7933.90555065],
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
            coordinates: [14083.2964644, -8137.9299931099995],
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
            coordinates: [13223.5361652, -7756.20555065],
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
          coordinates: [13430.1821652, -7933.90555065],
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
            coordinates: [14083.2964644, -8137.9299931099995],
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
            coordinates: [13223.5361652, -7756.20555065],
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
          coordinates: [13428.1361652, -7933.90555065],
          region: "TheFingersHex",
          lastChange: 1701336872110,
          lastTeam: "Colonial",
        }),
        expect.objectContaining({
          team: "Warden",
          icon: "MapIconStormCannon",
          type: "stormCannon",
          notes: "Storm Cannon",
          coordinates: [13428.1361652, -7933.90555065],
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
            coordinates: [14083.2964644, -8137.9299931099995],
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
            coordinates: [13223.5361652, -7756.20555065],
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
