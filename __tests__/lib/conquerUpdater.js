const fs = require('fs')

fs.unlinkSync(__dirname + '/../../data/conquer.test.json')
fs.unlinkSync(__dirname + '/../../data/war.test.json')

jest.mock('../../lib/config')
const config = require('../../lib/config')
jest.mock('../../lib/warapi')
const warApi = require('../../lib/warapi')
const conquerUpdater = require('../../lib/conquerUpdater')

test('getWarFeaturesInit', () => {
  const warFeatures = conquerUpdater.getWarFeatures()
  expect(warFeatures).toStrictEqual({features: [], deactivatedRegions: undefined, version: ''});
});

//
// console.log(warApi)
// console.log(config)

test('updateMapTests', () => {
  warApi.maps.mockResolvedValue(["TheFingersHex"])
  warApi.getTeam.mockImplementation((teamId) => {
    if (teamId === 'NONE') {
      return ''
    }
    if (teamId === 'COLONIALS') {
      return 'Colonial'
    }
    if (teamId === 'WARDENS') {
      return 'Warden'
    }
  })
  const data1 = {
    "regionId": 38,
    "scorchedVictoryTowns": 0,
    "mapItems": [
      {
        "teamId": "NONE",
        "iconType": 20,
        "x": 0.8716014,
        "y": 0.58127743,
        "flags": 0,
        "viewDirection": 0
      },
      {
        "teamId": "COLONIALS",
        "iconType": 45,
        "x": 0.4513862,
        "y": 0.36646345,
        "flags": 8,
        "viewDirection": 0
      }
    ],
    "mapItemsC": [],
    "mapItemsW": [],
    "mapTextItems": [],
    "lastUpdated": 1701336872072,
    "version": 10
  }
  const data2 = {
    "regionId": 38,
    "scorchedVictoryTowns": 0,
    "mapItems": [
      {
        "teamId": "NONE",
        "iconType": 20,
        "x": 0.8716014,
        "y": 0.58127743,
        "flags": 0,
        "viewDirection": 0
      },
      {
        "teamId": "NONE",
        "iconType": 45,
        "x": 0.4513862,
        "y": 0.36646345,
        "flags": 8,
        "viewDirection": 0
      }
    ],
    "mapItemsC": [],
    "mapItemsW": [],
    "mapTextItems": [],
    "lastUpdated": 1701336872080,
    "version": 11
  }
  const data3 = {
    "regionId": 38,
    "scorchedVictoryTowns": 0,
    "mapItems": [
      {
        "teamId": "NONE",
        "iconType": 20,
        "x": 0.8716014,
        "y": 0.58127743,
        "flags": 0,
        "viewDirection": 0
      },
      {
        "teamId": "WARDENS",
        "iconType": 45,
        "x": 0.4513862,
        "y": 0.36646345,
        "flags": 8,
        "viewDirection": 0
      },
      {
        "teamId": "WARDENS",
        "iconType": 59,
        "x": 0.5513862,
        "y": 0.46646345,
        "flags": 0,
        "viewDirection": 0
      }
    ],
    "mapItemsC": [],
    "mapItemsW": [],
    "mapTextItems": [],
    "lastUpdated": 1701336872090,
    "version": 12
  }
  const data4 = {
    "regionId": 38,
    "scorchedVictoryTowns": 0,
    "mapItems": [
      {
        "teamId": "NONE",
        "iconType": 20,
        "x": 0.8716014,
        "y": 0.58127743,
        "flags": 0,
        "viewDirection": 0
      },
      {
        "teamId": "NONE",
        "iconType": 45,
        "x": 0.4513862,
        "y": 0.36646345,
        "flags": 8,
        "viewDirection": 0
      },
      {
        "teamId": "WARDENS",
        "iconType": 59,
        "x": 0.5513862,
        "y": 0.46646345,
        "flags": 0,
        "viewDirection": 0
      },
      {
        "teamId": "WARDENS",
        "iconType": 59,
        "x": 0.5523862,
        "y": 0.46646345,
        "flags": 0,
        "viewDirection": 0
      }
    ],
    "mapItemsC": [],
    "mapItemsW": [],
    "mapTextItems": [],
    "lastUpdated": 1701336872100,
    "version": 13
  }
  const data5 = {
    "regionId": 38,
    "scorchedVictoryTowns": 0,
    "mapItems": [
      {
        "teamId": "NONE",
        "iconType": 20,
        "x": 0.8716014,
        "y": 0.58127743,
        "flags": 0,
        "viewDirection": 0
      },
      {
        "teamId": "COLONIALS",
        "iconType": 45,
        "x": 0.4513862,
        "y": 0.36646345,
        "flags": 8,
        "viewDirection": 0
      },
      {
        "teamId": "WARDENS",
        "iconType": 59,
        "x": 0.5523862,
        "y": 0.46646345,
        "flags": 0,
        "viewDirection": 0
      },
      {
        "teamId": "COLONIALS",
        "iconType": 59,
        "x": 0.5513862,
        "y": 0.46646345,
        "flags": 0,
        "viewDirection": 0
      }
    ],
    "mapItemsC": [],
    "mapItemsW": [],
    "mapTextItems": [],
    "lastUpdated": 1701336872110,
    "version": 14
  }

  warApi.dynamicMap.mockResolvedValue(data1)
  warApi.dynamicMapETag.mockResolvedValue(data1)
  return conquerUpdater.updateMap()
    .then((data) => {
      expect(data).not.toBeNull()
      const featureIds = Object.keys(data.features)
      expect(featureIds.length).toBe(1)
      expect(data.features[featureIds]).toEqual({
        team: 'Colonial',
        icon: 'MapIconRelicBase',
        flags: 8,
        lastChange: 1701336872072,
        lastTeam: ''
      })
      const warFeatures = conquerUpdater.getWarFeatures()
      expect(warFeatures).toEqual( expect.objectContaining({deactivatedRegions: ["TerminusHex","AllodsBightHex","EndlessShoreHex","WeatheredExpanseHex","ClansheadValleyHex","MorgensCrossingHex","GodcroftsHex","TempestIslandHex","CallahansPassageHex","ReachingTrailHex","BasinSionnachHex","ViperPitHex","HowlCountyHex","AcrithiaHex","ShackledChasmHex","DrownedValeHex","MarbanHollow","FarranacCoastHex","NevishLineHex","CallumsCapeHex","MooringCountyHex","SpeakingWoodsHex","AshFieldsHex","SableportHex","KingsCageHex","StonecradleHex","WestgateHex","OriginHex","RedRiverHex","HeartlandsHex","LochMorHex","LinnMercyHex","KalokaiHex","GreatMarchHex","UmbralWildwoodHex","DeadLandsHex","FishermansRowHex","OarbreakerHex","StlicanShelfHex","ReaversPassHex","ClahstraHex","StemaLandingHex"]}));
      expect(warFeatures.features).toEqual([expect.objectContaining({geometry: {coordinates: [14104.78287,-8136.76743825], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconSalvageColor', notes: 'Salvage Field', team: '', time: '', type: 'field', user: 'World', region: 'TheFingersHex'}), type: 'Feature'}), expect.objectContaining({geometry: {coordinates: [13243.34171,-7755.47262375], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconRelicBase', notes: 'Fort Barley Small Relic Base', team: '', time: '', type: 'town', voronoi: '2abff407-2f07-48d6-acec-84876a0994d3', user: 'World', region: 'TheFingersHex'}), type: 'Feature'})]);
      warApi.eTags['TheFingersHex'] = 10
      warApi.dynamicMap.mockResolvedValue(null)
      warApi.dynamicMapETag.mockResolvedValue(null)
      return conquerUpdater.updateMap()
    })
    .then((data) => {
      expect(data).toBeNull()
      const warFeatures = conquerUpdater.getWarFeatures()
      expect(warFeatures).toEqual( expect.objectContaining({deactivatedRegions: ["TerminusHex","AllodsBightHex","EndlessShoreHex","WeatheredExpanseHex","ClansheadValleyHex","MorgensCrossingHex","GodcroftsHex","TempestIslandHex","CallahansPassageHex","ReachingTrailHex","BasinSionnachHex","ViperPitHex","HowlCountyHex","AcrithiaHex","ShackledChasmHex","DrownedValeHex","MarbanHollow","FarranacCoastHex","NevishLineHex","CallumsCapeHex","MooringCountyHex","SpeakingWoodsHex","AshFieldsHex","SableportHex","KingsCageHex","StonecradleHex","WestgateHex","OriginHex","RedRiverHex","HeartlandsHex","LochMorHex","LinnMercyHex","KalokaiHex","GreatMarchHex","UmbralWildwoodHex","DeadLandsHex","FishermansRowHex","OarbreakerHex","StlicanShelfHex","ReaversPassHex","ClahstraHex","StemaLandingHex"]}));
      expect(warFeatures.features).toEqual([expect.objectContaining({geometry: {coordinates: [14104.78287,-8136.76743825], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconSalvageColor', notes: 'Salvage Field', team: '', time: '', type: 'field', user: 'World', region: 'TheFingersHex'}), type: 'Feature'}), expect.objectContaining({geometry: {coordinates: [13243.34171,-7755.47262375], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconRelicBase', notes: 'Fort Barley Small Relic Base', team: '', time: '', type: 'town', voronoi: '2abff407-2f07-48d6-acec-84876a0994d3', user: 'World', region: 'TheFingersHex'}), type: 'Feature'})]);
      warApi.eTags['TheFingersHex'] = 10
      warApi.dynamicMap.mockResolvedValue(data2)
      warApi.dynamicMapETag.mockResolvedValue(data2)
      return conquerUpdater.updateMap()
    })
    .then((data) => {
      expect(data).not.toBeNull()
      const featureIds = Object.keys(data.features)
      expect(featureIds.length).toBe(1)
      expect(data.features[featureIds]).toEqual({
        team: '',
        icon: 'MapIconRelicBase',
        flags: 8,
        lastChange: 1701336872080,
        lastTeam: 'Colonial'
      })
      const warFeatures = conquerUpdater.getWarFeatures()
      expect(warFeatures).toEqual( expect.objectContaining({deactivatedRegions: ["TerminusHex","AllodsBightHex","EndlessShoreHex","WeatheredExpanseHex","ClansheadValleyHex","MorgensCrossingHex","GodcroftsHex","TempestIslandHex","CallahansPassageHex","ReachingTrailHex","BasinSionnachHex","ViperPitHex","HowlCountyHex","AcrithiaHex","ShackledChasmHex","DrownedValeHex","MarbanHollow","FarranacCoastHex","NevishLineHex","CallumsCapeHex","MooringCountyHex","SpeakingWoodsHex","AshFieldsHex","SableportHex","KingsCageHex","StonecradleHex","WestgateHex","OriginHex","RedRiverHex","HeartlandsHex","LochMorHex","LinnMercyHex","KalokaiHex","GreatMarchHex","UmbralWildwoodHex","DeadLandsHex","FishermansRowHex","OarbreakerHex","StlicanShelfHex","ReaversPassHex","ClahstraHex","StemaLandingHex"]}));
      expect(warFeatures.features).toEqual([expect.objectContaining({geometry: {coordinates: [14104.78287,-8136.76743825], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconSalvageColor', notes: 'Salvage Field', team: '', time: '', type: 'field', user: 'World', region: 'TheFingersHex'}), type: 'Feature'}), expect.objectContaining({geometry: {coordinates: [13243.34171,-7755.47262375], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconRelicBase', notes: 'Fort Barley Small Relic Base', team: '', time: '', type: 'town', voronoi: '2abff407-2f07-48d6-acec-84876a0994d3', user: 'World', region: 'TheFingersHex'}), type: 'Feature'})]);
      warApi.eTags['TheFingersHex'] = 11
      warApi.dynamicMap.mockResolvedValue(data3)
      warApi.dynamicMapETag.mockResolvedValue(data3)
      return conquerUpdater.updateMap()
    })
    .then((data) => {
      expect(data).not.toBeNull()
      expect(Object.keys(data.features).length).toBe(2)
      expect(Object.values(data.features)).toEqual([expect.objectContaining({
        team: 'Warden',
        icon: 'MapIconRelicBase',
        flags: 8,
        lastChange: 1701336872090,
        lastTeam: 'Colonial'
      }), expect.objectContaining({
        team: 'Warden',
        icon: 'MapIconStormCannon',
        type: 'stormCannon',
        notes: 'Storm Cannon',
        coordinates: [ 13448.34171, -7932.97262375 ],
        region: 'TheFingersHex',
        lastChange: 1701336872090,
        lastTeam: 'Warden'
      })])
      const warFeatures = conquerUpdater.getWarFeatures()
      expect(warFeatures).toEqual( expect.objectContaining({deactivatedRegions: ["TerminusHex","AllodsBightHex","EndlessShoreHex","WeatheredExpanseHex","ClansheadValleyHex","MorgensCrossingHex","GodcroftsHex","TempestIslandHex","CallahansPassageHex","ReachingTrailHex","BasinSionnachHex","ViperPitHex","HowlCountyHex","AcrithiaHex","ShackledChasmHex","DrownedValeHex","MarbanHollow","FarranacCoastHex","NevishLineHex","CallumsCapeHex","MooringCountyHex","SpeakingWoodsHex","AshFieldsHex","SableportHex","KingsCageHex","StonecradleHex","WestgateHex","OriginHex","RedRiverHex","HeartlandsHex","LochMorHex","LinnMercyHex","KalokaiHex","GreatMarchHex","UmbralWildwoodHex","DeadLandsHex","FishermansRowHex","OarbreakerHex","StlicanShelfHex","ReaversPassHex","ClahstraHex","StemaLandingHex"]}));
      expect(warFeatures.features).toEqual([expect.objectContaining({geometry: {coordinates: [14104.78287,-8136.76743825], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconSalvageColor', notes: 'Salvage Field', team: '', time: '', type: 'field', user: 'World', region: 'TheFingersHex'}), type: 'Feature'}), expect.objectContaining({geometry: {coordinates: [13243.34171,-7755.47262375], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconRelicBase', notes: 'Fort Barley Small Relic Base', team: '', time: '', type: 'town', voronoi: '2abff407-2f07-48d6-acec-84876a0994d3', user: 'World', region: 'TheFingersHex'}), type: 'Feature'})]);
      warApi.eTags['TheFingersHex'] = 12
      warApi.dynamicMap.mockResolvedValue(data4)
      warApi.dynamicMapETag.mockResolvedValue(data4)
      return conquerUpdater.updateMap()
    })
    .then((data) => {
      expect(data).not.toBeNull()
      expect(Object.keys(data.features).length).toBe(2)
      expect(Object.values(data.features)).toEqual([expect.objectContaining({
        team: '',
        icon: 'MapIconRelicBase',
        flags: 8,
        lastChange: 1701336872100,
        lastTeam: 'Warden'
      }), expect.objectContaining({
        team: 'Warden',
        icon: 'MapIconStormCannon',
        type: 'stormCannon',
        notes: 'Storm Cannon',
        coordinates: [ 13450.39171, -7932.97262375 ],
        region: 'TheFingersHex',
        lastChange: 1701336872100,
        lastTeam: 'Warden'
      })])
      const warFeatures = conquerUpdater.getWarFeatures()
      expect(warFeatures).toEqual( expect.objectContaining({deactivatedRegions: ["TerminusHex","AllodsBightHex","EndlessShoreHex","WeatheredExpanseHex","ClansheadValleyHex","MorgensCrossingHex","GodcroftsHex","TempestIslandHex","CallahansPassageHex","ReachingTrailHex","BasinSionnachHex","ViperPitHex","HowlCountyHex","AcrithiaHex","ShackledChasmHex","DrownedValeHex","MarbanHollow","FarranacCoastHex","NevishLineHex","CallumsCapeHex","MooringCountyHex","SpeakingWoodsHex","AshFieldsHex","SableportHex","KingsCageHex","StonecradleHex","WestgateHex","OriginHex","RedRiverHex","HeartlandsHex","LochMorHex","LinnMercyHex","KalokaiHex","GreatMarchHex","UmbralWildwoodHex","DeadLandsHex","FishermansRowHex","OarbreakerHex","StlicanShelfHex","ReaversPassHex","ClahstraHex","StemaLandingHex"]}));
      expect(warFeatures.features).toEqual([expect.objectContaining({geometry: {coordinates: [14104.78287,-8136.76743825], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconSalvageColor', notes: 'Salvage Field', team: '', time: '', type: 'field', user: 'World', region: 'TheFingersHex'}), type: 'Feature'}), expect.objectContaining({geometry: {coordinates: [13243.34171,-7755.47262375], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconRelicBase', notes: 'Fort Barley Small Relic Base', team: '', time: '', type: 'town', voronoi: '2abff407-2f07-48d6-acec-84876a0994d3', user: 'World', region: 'TheFingersHex'}), type: 'Feature'})]);
      warApi.eTags['TheFingersHex'] = 13
      warApi.dynamicMap.mockResolvedValue(data5)
      warApi.dynamicMapETag.mockResolvedValue(data5)
      return conquerUpdater.updateMap()
    })
    .then((data) => {
      expect(data).not.toBeNull()
      expect(Object.keys(data.features).length).toBe(3)
      expect(Object.values(data.features)).toEqual([expect.objectContaining({
        team: 'Colonial',
        icon: 'MapIconRelicBase',
        flags: 8,
        lastChange: 1701336872110,
        lastTeam: 'Warden'
      }), expect.objectContaining({
        team: 'Colonial',
        icon: 'MapIconStormCannon',
        type: 'stormCannon',
        notes: 'Storm Cannon',
        coordinates: [ 13448.34171, -7932.97262375 ],
        region: 'TheFingersHex',
        lastChange: 1701336872110,
        lastTeam: 'Colonial'
      }), expect.objectContaining({
        team: 'Warden',
        icon: 'MapIconStormCannon',
        type: 'stormCannon',
        notes: 'Storm Cannon',
        coordinates: [ 13448.34171, -7932.97262375 ],
        region: 'TheFingersHex',
        lastChange: 1701336872090,
        lastTeam: 'Warden',
        destroyed: true
      })])
      const warFeatures = conquerUpdater.getWarFeatures()
      expect(warFeatures).toEqual( expect.objectContaining({deactivatedRegions: ["TerminusHex","AllodsBightHex","EndlessShoreHex","WeatheredExpanseHex","ClansheadValleyHex","MorgensCrossingHex","GodcroftsHex","TempestIslandHex","CallahansPassageHex","ReachingTrailHex","BasinSionnachHex","ViperPitHex","HowlCountyHex","AcrithiaHex","ShackledChasmHex","DrownedValeHex","MarbanHollow","FarranacCoastHex","NevishLineHex","CallumsCapeHex","MooringCountyHex","SpeakingWoodsHex","AshFieldsHex","SableportHex","KingsCageHex","StonecradleHex","WestgateHex","OriginHex","RedRiverHex","HeartlandsHex","LochMorHex","LinnMercyHex","KalokaiHex","GreatMarchHex","UmbralWildwoodHex","DeadLandsHex","FishermansRowHex","OarbreakerHex","StlicanShelfHex","ReaversPassHex","ClahstraHex","StemaLandingHex"]}));
      expect(warFeatures.features).toEqual([expect.objectContaining({geometry: {coordinates: [14104.78287,-8136.76743825], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconSalvageColor', notes: 'Salvage Field', team: '', time: '', type: 'field', user: 'World', region: 'TheFingersHex'}), type: 'Feature'}), expect.objectContaining({geometry: {coordinates: [13243.34171,-7755.47262375], type: 'Point'}, properties: expect.objectContaining({icon: 'MapIconRelicBase', notes: 'Fort Barley Small Relic Base', team: '', time: '', type: 'town', voronoi: '2abff407-2f07-48d6-acec-84876a0994d3', user: 'World', region: 'TheFingersHex'}), type: 'Feature'})]);
      warApi.eTags['TheFingersHex'] = 14
      // warApi.dynamicMap.mockResolvedValue(data5)
      // warApi.dynamicMapETag.mockResolvedValue(data5)
      // return conquerUpdater.updateMap()
    })
})