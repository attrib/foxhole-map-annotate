import {Vector as VectorSource} from "ol/source";
import {Fill, Icon, Style, Text} from "ol/style";
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
      source: new VectorSource({
        features: this.regionCollection
      }),
      zIndex: 0,
      minResolution: 4,
      style: this.regionStyle
    }))
    regionGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.majorCollection
      }),
      zIndex: 1,
      maxResolution: 4,
      style: this.regionStyle
    }))
    regionGroup.getLayers().push(new Vector({
      source: new VectorSource({
        features: this.minorCollection
      }),
      zIndex: 1,
      maxResolution: 1.5,
      style: this.regionStyle
    }))
    map.addLayer(regionGroup)
    map.addLayer(new Vector({
      source: new VectorSource({
        features: this.townCollection
      }),
      zIndex: 0,
      title: 'Towns/Relics',
      maxResolution: 5,
      style: this.iconStyle
    }))
    map.addLayer(new Vector({
      source: new VectorSource({
        features: this.industryCollection
      }),
      title: 'Industry',
      zIndex: 1,
      maxResolution: 4,
      style: this.iconStyle
    }))

    this.loadRegion()
  }

  regionStyle = (feature) => {
    this.labelStyle[0].getText().setText(feature.get('notes'))
    this.labelStyle[1].getText().setText(feature.get('notes'))
    return this.labelStyle
  }

  iconStyle = (feature) => {
    return new Style({
      image: new Icon({
        src: `/images/${feature.get('type')}/${feature.get('icon')}.png`
      }),
    })

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
            case 'town':
              console.log(feature)
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
