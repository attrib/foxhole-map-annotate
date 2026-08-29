import {Collection, Map} from 'ol'
import type Socket from "./webSocket";
import {Vector as VectorSource} from "ol/source";
import {Fill, Icon as olIcon, Style} from "ol/style";
import {Vector} from "ol/layer";
import {Circle as CircleGeo} from "ol/geom";
import {FeatureLike} from "ol/Feature";
import {GeoJSON} from "ol/format";

class Weather {

    weatherSource: VectorSource
    geoJson: GeoJSON
    scaling: number

    constructor(map: Map, socket: Socket, scaling: number) {
        this.weatherSource = new VectorSource({
            features: new Collection([]),
        })
        const weatherLayer = new Vector({
            source: this.weatherSource,
            title: 'Weather',
            zIndex: 5,
            // maxResolution: 6,
            style: this.style.bind(this),
            searchable: false,
            tooltip: true,
        })
        map.addLayer(weatherLayer)
        socket.on('weather', this.updateWeather.bind(this))
        this.geoJson = new GeoJSON();
        this.scaling = scaling
    }

    style(feature: FeatureLike): Style[] {
        const isSnow = feature.get('type_code') === 'snow';
        return [
            new Style({
                fill: new Fill({
                    color: isSnow ? '#F1F7FF66' : '#36C5D066'
                }),
                geometry: (feature) => {
                    return new CircleGeo(feature.getGeometry().getFirstCoordinate(), feature.get('radius') * this.scaling)
                }
            }),
            new Style({
                image: new olIcon({
                    src: `/images/information/WeatherEvent${isSnow ? 'Snow' : 'Rain'}.svg`,
                }),
            })
        ];
    }

    updateWeather(weather) {
        const col = this.geoJson.readFeatures(weather)
        this.weatherSource.clear(true)
        this.weatherSource.addFeatures(col)
    }
}

export default Weather