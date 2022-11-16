import {Vector as VectorSource} from "ol/source";
import {Fill, Stroke, Style, Text} from "ol/style";
import {Group, Vector} from "ol/layer";
import {GeoJSON} from "ol/format";
import {Collection} from "ol";

class StaticLayers {

  constructor(map) {
    const regionGroup = new Group({
      title: 'Regions',
    })

    this.regionCollection = new Collection()
    this.majorCollection = new Collection()
    this.minorCollection = new Collection()

    this.regionStyle = [
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
      source: new VectorSource({
        features: this.regionCollection
      }),
      zIndex: 0,
      minResolution: 4,
      style: this.style
    }))
    regionGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.majorCollection
      }),
      zIndex: 0,
      maxResolution: 4,
      style: this.style
    }))
    regionGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.minorCollection
      }),
      zIndex: 0,
      maxResolution: 1.5,
      style: this.style
    }))
    map.addLayer(regionGroup)

    this.loadRegion()
  }

  style = (feature) => {
    this.regionStyle[0].getText().setText(feature.get('notes'))
    this.regionStyle[1].getText().setText(feature.get('notes'))
    return this.regionStyle
  }

  loadRegion = () => {
    const geoJson = new GeoJSON();
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/regions.json');
    xhr.onload = () => {
      if (xhr.status == 200) {
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
          }
        })
      }
    }
    xhr.send();
  }

}


export default StaticLayers
