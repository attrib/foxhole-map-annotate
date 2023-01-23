import {Vector as VectorSource} from "ol/source";
import {Fill, Icon, Stroke, Style, Text} from "ol/style";
import {Group, Vector} from "ol/layer";
import {GeoJSON} from "ol/format";
import {Collection, Feature} from "ol";
import CircleStyle from "ol/style/Circle";
import {easeOut} from "ol/easing";
import {getVectorContext} from "ol/render";
import {unByKey} from "ol/Observable";
import {Point} from "ol/geom";

class StaticLayers {

  constructor(map, conquerStatus, warFeatures) {
    this.map = map
    this.conquerStatus = conquerStatus
    this.warFeatures = warFeatures
    const regionGroup = new Group({
      title: 'Labels',
      combine: true,
    })
    const staticGroup = new Group({
      title: 'Region',
      fold: 'close',
    })

    this.sources = {
      'Region': new VectorSource({
        features: new Collection()
      }),
      'Major': new VectorSource({
        features: new Collection()
      }),
      'Minor': new VectorSource({
        features: new Collection()
      }),
      'town': new VectorSource({
        features: new Collection()
      }),
      'voronoi': new VectorSource({
        features: new Collection()
      }),
      'industry': new VectorSource({
        features: new Collection()
      }),
      'field': new VectorSource({
        features: new Collection()
      }),
      'stormCannon': new VectorSource({
        features: new Collection()
      }),
    }

    this.labelStyle = [
      new Style({
        text: new Text({
          font: '1rem system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          text: '',
          overflow: true,
          fill: new Fill({
            color: 'rgba(255,255,255,.8)',
          }),
          offsetX: 1,
          offsetY: 1,
        })
      }), new Style({
        text: new Text({
          font: '1rem system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          text: '',
          overflow: true,
          fill: new Fill({
            color: '#000',
          }),
        })
      })
    ]

    this.conquestTeamStyles = {
      '': new Style({
        fill: new Fill({
          color: '#FFFFFF00',
        }),
        stroke: new Stroke({
          color: '#00000011',
          width: 1
        })
      }),
      'Warden': new Style({
        fill: new Fill({
          color: '#24568244',
        }),
        stroke: new Stroke({
          color: '#24568222',
          width: 1
        })
      }),
      'Colonial': new Style({
        fill: new Fill({
          color: '#516C4B44',
        }),
        stroke: new Stroke({
          color: '#516C4B22',
          width: 1
        })
      }),
    }

    regionGroup.getLayers().push(new Vector({
      title: 'Regions',
      source: this.sources.Region,
      zIndex: 100,
      minResolution: 4,
      style: this.regionStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      tooltip: false,
    }))
    regionGroup.getLayers().push(new Vector({
      title: 'Major Labels',
      source: this.sources.Major,
      zIndex: 100,
      maxResolution: 4,
      style: this.regionStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      tooltip: false,
    }))
    regionGroup.getLayers().push(new Vector({
      title: 'Minor Labels',
      source: this.sources.Minor,
      zIndex: 99,
      maxResolution: 1.5,
      style: this.regionStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      tooltip: false,
    }))
    staticGroup.getLayers().push(new Vector({
      source: this.sources.voronoi,
      zIndex: 1,
      title: 'Conquest',
      style: this.conquestStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      searchable: false,
      tooltip: false,
    }))
    staticGroup.getLayers().push(regionGroup)
    staticGroup.getLayers().push(new Vector({
      source: this.sources.town,
      zIndex: 1,
      title: 'Towns/Relics',
      maxResolution: 5,
      style: this.iconStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      searchable: true,
    }))
    staticGroup.getLayers().push(new Vector({
      source: this.sources.industry,
      title: 'Industry',
      zIndex: 1,
      maxResolution: 4,
      style: this.iconStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      searchable: false,
    }))
    staticGroup.getLayers().push(new Vector({
      title: 'Fields',
      source: this.sources.field,
      zIndex: 1,
      maxResolution: 4,
      style: this.iconStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      searchable: false,
    }))
    staticGroup.getLayers().push(new Vector({
      title: 'Storm Cannons',
      source: this.sources.stormCannon,
      zIndex: 6,
      maxResolution: 6,
      style: this.iconStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      searchable: false,
    }))
    map.addLayer(staticGroup)

    this.notificationLayer = new Vector({
      zIndex: 100,
      source: new VectorSource({
        features: new Collection()
      }),
      style: this.iconStyle,
      searchable: false,
      tooltip: false,
    })
    map.addLayer(this.notificationLayer)
    this.deactivatedLayer = new Vector({
      zIndex: 100,
      source: new VectorSource({
        features: new Collection()
      }),
      style: new Style({
        fill: new Fill({
          color: '#212529AA'
        }),
        stroke: new Stroke({
          color: '#212529AA'
        })
      }),
      searchable: false,
      tooltip: false,
    })
    map.addLayer(this.deactivatedLayer)

    this.cachedIconStyle = {}
    this.loadRegion(false)
  }

  regionStyle = (feature) => {
    if (this.warFeatures.deactivatedRegions && this.warFeatures.deactivatedRegions.includes(feature.getId())) {
      return null
    }
    this.labelStyle[0].getText().setText(feature.get('notes'))
    this.labelStyle[1].getText().setText(feature.get('notes'))
    return this.labelStyle
  }

  conquestStyle = (feature) => {
    let team = feature.get('team') || ''
    if (team === 'none') {
      team = ''
    }
    const region = feature.get('region')
    if (region && this.warFeatures.deactivatedRegions && this.warFeatures.deactivatedRegions.includes(region)) {
      return null
    }
    return this.conquestTeamStyles[team]
  }

  iconStyle = (feature, resolution) => {
    const icon = feature.get('icon')
    let team = feature.get('team') || ''
    if (team === 'none') {
      team = ''
    }
    const region = feature.get('region')
    if (region && this.warFeatures.deactivatedRegions && this.warFeatures.deactivatedRegions.includes(region)) {
      return null
    }
    if (icon === 'MapIconSafehouse' && resolution > 4) {
      // safehouses are static but also want to show them only when showing industry
      return null
    }
    const cacheKey = `${icon}${team}`
    if (!(cacheKey in this.cachedIconStyle)) {
      this.cachedIconStyle[cacheKey] = new Style({
        image: new Icon({
          src: `/images/${feature.get('type')}/${feature.get('icon')}.png`,
          color: team === '' ? undefined : team === 'Warden' ? '#245682' : '#516C4B',
          scale: (feature.get('type') === 'town' || feature.get('type') === 'field' || feature.get('type') === 'stormCannon') ? 2/3 : 1,
        }),
        zIndex: icon === 'MapIconSafehouse' ? 0 : undefined,
      });
    }
    return this.cachedIconStyle[cacheKey]
  }

  conquerUpdate = (features, flash = true) => {
    // More than 40 changes, do not flash to not kill client
    // Should only happen when war map changes
    if (flash && Object.keys(features).length > 40) {
      flash = false
    }
    for (const id in features) {
      const data = features[id]
      const town = this.sources.town.getFeatureById(id)
      if (town) {
        town.set('icon', data.icon, true)
        town.set('team', data.team)
        if (flash) {
          this.flash(town)
        }
        if (town.get('voronoi') && data.icon !== 'MapIconRocketSite' && data.icon !== 'MapIconObservationTower') {
          const voronoi = this.sources.voronoi.getFeatureById(town.get('voronoi'))
          if (voronoi) {
            voronoi.set('team', data.team)
          }
        }
        continue
      }
      const industry = this.sources.industry.getFeatureById(id)
      if (industry) {
        industry.set('team', data.team)
        if (flash) {
          this.flash(industry)
        }
        continue
      }
      if (data.type === 'stormCannon') {
        if (!data.destroyed) {
          this.sources.stormCannon.addFeature(this.createStormCannonFeature(id, data))
        }
        else {
          const stormCannon = this.sources.stormCannon.getFeatureById(id)
          if (stormCannon) {
            this.sources.stormCannon.removeFeature(stormCannon)
          }
          delete this.conquerStatus.features[id]
        }
      }
    }
  }

  warFeaturesUpdate = () => {
    const geoJson = new GeoJSON();
    const collections = {
      fields: [],
      industry: [],
    }
    this.warFeatures.features.forEach((feature) => {
      feature = geoJson.readFeature(feature)
      const type = feature.get('type')
      if (!(type in collections)) {
        collections[type] = []
      }
      if (feature.get('id') in this.conquerStatus.features) {
        feature.set('icon', this.conquerStatus.features[feature.get('id')].icon)
        feature.set('team', this.conquerStatus.features[feature.get('id')].team)
      }
      collections[type].push(feature)
    })
    for (const type in collections) {
      if (type in this.sources) {
        this.sources[type].clear(true)
        this.sources[type].addFeatures(collections[type])
      }
    }
    this.deactivatedLayer.getSource().clear(true)
    const deactivatedRegionFeatures = []
    for (const regionId of this.warFeatures.deactivatedRegions || []) {
      const region = this.sources.Region.getFeatureById(regionId).clone()
      deactivatedRegionFeatures.push(region)
    }
    this.deactivatedLayer.getSource().addFeatures(deactivatedRegionFeatures)
  }

  resetWar = () => {
    this.deactivatedLayer.getSource().clear()
    this.sources.stormCannon.getSource().clear()
    this.sources.industry.getSource().clear()
    this.sources.field.getSource().clear()
    for (const type in this.sources) {
      this.sources[type].forEachFeature((feature) => {
        if (feature.get('icon')?.startsWith('MapIconTownBaseTier')) {
          feature.set('icon', 'MapIconTownBaseTier1', true)
        }
        feature.set('team', '')
      })
    }
  }

  flash = (feature) => {
    feature = feature.clone()
    const duration = 5000;
    const start = Date.now()
    const flashGeom = feature.getGeometry().clone();
    const listenerKey = this.notificationLayer.on('postrender', animate);
    const map = this.map
    const flashStyle = new Style({
      zIndex: 100,
      image: new CircleStyle({
        radius: 0,
        stroke: new Stroke({
          color: 'rgba(255, 0, 0, 1)',
          width: 0.25,
        }),
      }),
    })
    const source = this.notificationLayer.getSource()
    source.addFeature(feature)

    function animate(event) {
      const frameState = event.frameState;
      const elapsed = frameState.time - start;
      if (elapsed >= duration) {
        unByKey(listenerKey);
        source.removeFeature(feature)
        return;
      }
      const vectorContext = getVectorContext(event);
      const elapsedRatio = elapsed / duration;
      // radius will be 5 at start and 30 at end.
      const radius = easeOut(elapsedRatio) * 30 + 5;
      const opacity = easeOut(1 - elapsedRatio);

      flashStyle.getImage().setRadius(radius)
      flashStyle.getImage().getStroke().setColor('rgba(255, 0, 0, ' + opacity + ')')
      flashStyle.getImage().getStroke().setWidth(0.25 + opacity)

      vectorContext.setStyle(flashStyle);
      vectorContext.drawGeometry(flashGeom);
      // tell OpenLayers to continue postrender animation
      map.render();
    }
  }

  loadRegion = () => {
    const geoJson = new GeoJSON();
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/static.json');
    xhr.onload = () => {
      if (xhr.status === 200) {
        const features = geoJson.readFeatures(xhr.responseText);
        const collections = {}
        features.forEach((feature) => {
          const type = feature.get('type')
          if (!(type in collections)) {
            collections[type] = []
          }
          if (feature.get('id') in this.conquerStatus.features) {
            feature.set('icon', this.conquerStatus.features[feature.get('id')].icon, true)
            feature.set('team', this.conquerStatus.features[feature.get('id')].team)
          }
          if (feature.get('town') in this.conquerStatus.features) {
            feature.set('team', this.conquerStatus.features[feature.get('town')].team)
          }
          collections[type].push(feature)
        })
        for (const type in this.sources) {
          this.sources[type].clear(true)
          this.sources[type].addFeatures(collections[type] || [])
        }
        this.warFeaturesUpdate()
        const stormCannons = []
        for (const id in this.conquerStatus.features) {
          const feature = this.conquerStatus.features[id]
          if (feature.type === 'stormCannon') {
            if (feature.destroyed) {
              delete this.conquerStatus.features[id]
            }
            else {
              stormCannons.push(this.createStormCannonFeature(id, feature))
            }
          }
        }
        this.sources.stormCannon.clear(true)
        this.sources.stormCannon.addFeatures(stormCannons)
      }
    }
    xhr.send();
  }

  createStormCannonFeature = (id, conquerData) => {
    const feat = new Feature({
      type: conquerData.type,
      notes: conquerData.notes,
      icon: conquerData.icon,
      team: conquerData.team,
      geometry: new Point(conquerData.coordinates),
    });
    feat.setId(id)
    return feat
  }

}


export default StaticLayers
