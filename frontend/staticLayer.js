import {Vector as VectorSource} from "ol/source";
import {Fill, Style, Text} from "ol/style";
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

    const regionStyle = new Style({
      // stroke: new Stroke({
      //   color: 'rgba(0,0,0,0.8)',
      //   width: 2,
      // }),
      // fill: new Fill({
      //   color: 'rgba(85,85,85,0.1)',
      // }),
      text: new Text({
        font: '1rem system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        text: '',
        overflow: true,
        fill: new Fill({
          color: '#000',
        })
      })
    })

    regionGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.regionCollection
      }),
      zIndex: 0,
      minResolution: 4,
      style: (feature) => {
        regionStyle.getText().setText(feature.get('notes'))
        return regionStyle
      }
    }))
    regionGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.majorCollection
      }),
      zIndex: 0,
      maxResolution: 4,
      style: (feature) => {
        regionStyle.getText().setText(feature.get('notes'))
        return regionStyle
      }
    }))
    regionGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.minorCollection
      }),
      zIndex: 0,
      maxResolution: 1.5,
      style: (feature) => {
        regionStyle.getText().setText(feature.get('notes'))
        return regionStyle
      }
    }))
    map.addLayer(regionGroup)

    this.loadRegion()
  }

  loadRegion = () => {
    const geoJson = new GeoJSON();
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/regions.json');
    xhr.onload = () => {
      if (xhr.status == 200) {
        const features = geoJson.readFeatures(xhr.responseText);
        features.forEach((feature) => {
          console.log(feature.get('type'))
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
