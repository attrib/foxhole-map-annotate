import {Collection, Map} from 'ol'
import type Socket from "./webSocket";
import {Vector as VectorSource} from "ol/source";
import {Fill, Icon as olIcon, Style} from "ol/style";
import {Vector} from "ol/layer";
import {Circle as CircleGeo} from "ol/geom";
import {FeatureLike} from "ol/Feature";
import {GeoJSON} from "ol/format";

const WEATHER_STYLES = {
    snow: [
        new Style({
            fill: new Fill({ color: '#F1F7FF66' })
        }),
        new Style({
            image: new olIcon({ src: '/images/information/WeatherEventSnow.svg' })
        })
    ],
    rain: [
        new Style({
            fill: new Fill({ color: '#36C5D066' })
        }),
        new Style({
            image: new olIcon({ src: '/images/information/WeatherEventRain.svg' })
        })
    ]
};

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
            zIndex: 1,
            // maxResolution: 6,
            style: this.style.bind(this),
            searchable: false,
            tooltip: true,
            renderMode: 'image',
        })
        const urlParams = new URLSearchParams(window.location.search);
        const disableWeather = urlParams.get('no_weather') === 'true';
        if (!disableWeather) {
            map.addLayer(weatherLayer)
        }
        socket.on('weather', this.updateWeather.bind(this))
        this.geoJson = new GeoJSON();
        this.scaling = scaling
    }

    style(feature: FeatureLike): Style[] {
        const isSnow = feature.get('type_code') === 'snow';
        return isSnow ? WEATHER_STYLES.snow : WEATHER_STYLES.rain;
    }

    updateWeather(weather) {
        const col = this.geoJson.readFeatures(weather)
        this.weatherSource.clear(true)
        for (const weather of col) {
            weather.setGeometry(new CircleGeo(weather.getGeometry().getFirstCoordinate(), weather.get('radius') * this.scaling))
        }
        this.weatherSource.addFeatures(col)
    }
}

export default Weather