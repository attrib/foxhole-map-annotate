import {Vector as VectorSource} from "ol/source";
import {Fill, Icon, Stroke, Style, Text} from "ol/style";
import {Group, Vector} from "ol/layer";
import {GeoJSON} from "ol/format";
import {Collection} from "ol";
import CircleStyle from "ol/style/Circle";
import {easeOut} from "ol/easing";
import {getVectorContext} from "ol/render";
import {unByKey} from "ol/Observable";

class StaticLayers {

  constructor(map, conquerStatus) {
    this.map = map
    this.conquerStatus = conquerStatus
    const regionGroup = new Group({
      title: 'Labels',
      combine: true,
    })
    const staticGroup = new Group({
      title: 'Region',
      fold: 'close',
    })

    this.regionCollection = new Collection()
    this.majorCollection = new Collection()
    this.minorCollection = new Collection()
    this.townCollection = new Collection()
    this.industryCollection = new Collection()

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

    regionGroup.getLayers().push(new Vector({
      title: 'Regions',
      source: new VectorSource({
        features: this.regionCollection
      }),
      zIndex: 0,
      minResolution: 4,
      style: this.regionStyle
    }))
    regionGroup.getLayers().push(new Vector({
      title: 'Major Labels',
      source: new VectorSource({
        features: this.majorCollection
      }),
      zIndex: 1,
      maxResolution: 4,
      style: this.regionStyle
    }))
    regionGroup.getLayers().push(new Vector({
      title: 'Minor Labels',
      source: new VectorSource({
        features: this.minorCollection
      }),
      zIndex: 1,
      maxResolution: 1.5,
      style: this.regionStyle
    }))
    staticGroup.getLayers().push(regionGroup)
    staticGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.townCollection
      }),
      zIndex: 0,
      title: 'Towns/Relics',
      maxResolution: 5,
      style: this.iconStyle,
      searchable: false,
    }))
    staticGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.industryCollection
      }),
      title: 'Industry',
      zIndex: 1,
      maxResolution: 4,
      style: this.iconStyle,
      searchable: false,
    }))
    map.addLayer(staticGroup)

    this.notificationLayer = new Vector({
      zIndex: 100,
      source: new VectorSource({
        features: new Collection()
      }),
      style: this.iconStyle,
    })
    map.addLayer(this.notificationLayer)

    this.cachedIconStyle = {}
    this.loadRegion()
  }

  regionStyle = (feature) => {
    this.labelStyle[0].getText().setText(feature.get('notes'))
    this.labelStyle[1].getText().setText(feature.get('notes'))
    return this.labelStyle
  }

  iconStyle = (feature) => {
    const icon = feature.get('icon')
    let team = feature.get('team') || ''
    if (team === 'none') {
      team = ''
    }
    const cacheKey = `${icon}${team}`
    if (!(cacheKey in this.cachedIconStyle)) {
      this.cachedIconStyle[cacheKey] = new Style({
        image: new Icon({
          src: `/images/${feature.get('type')}/${feature.get('icon')}${team}.png`,
          scale: feature.get('type') === 'town' ? 2/3 : 1,
        }),
      });
    }
    return this.cachedIconStyle[cacheKey]
  }

  conquerUpdate = (features, flash = true) => {
    this.townCollection.forEach((feature) => {
      if (feature.getId() in features) {
        if (flash) {
          this.flash(feature)
        }
        const data = features[feature.getId()]
        feature.set('team', data.team)
        feature.set('icon', data.icon)
      }
    })
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
    xhr.open('GET', '/regions.json');
    xhr.onload = () => {
      if (xhr.status === 200) {
        const features = geoJson.readFeatures(xhr.responseText);
        features.forEach((feature) => {
          switch (feature.get('type')) {
            case 'Region':
              this.regionCollection.push(feature)
              break;
            case 'Major':
              this.majorCollection.push(feature)
              break;
            case 'Minor':
              this.minorCollection.push(feature)
              break;
            case 'town':
              if (feature.get('id') in this.conquerStatus.features) {
                feature.set('icon', this.conquerStatus.features[feature.get('id')].icon)
                feature.set('team', this.conquerStatus.features[feature.get('id')].team)
              }
              this.townCollection.push(feature)
              break;
            case 'industry':
              this.industryCollection.push(feature)
              break;
          }
        })
      }
    }
    xhr.send();
  }

}


export default StaticLayers
