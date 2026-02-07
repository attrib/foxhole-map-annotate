import { Collection } from "ol";
import Feature from "ol/Feature.js";
import { Circle } from "ol/geom.js";
import Point from "ol/geom/Point.js";
import Polygon, { fromCircle } from "ol/geom/Polygon.js";
import Translate from "ol/interaction/Translate.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import Fill from "ol/style/Fill.js";
import Icon from "ol/style/Icon.js";
import Stroke from "ol/style/Stroke.js";
import Style from "ol/style/Style.js";
import CircleStyle from "ol/style/Circle.js";


class SidebarAirRange {

    planes = {
        "Scout": {
            "range": 6100,
            "team": "W"
        },
        "Fighter" : {
            "range": 9200,
            "team": "W"
        },
        "Seafighter": {
            "range": 7200,
            "team": "W"
        },
        "Torpedo Bomber": { // ArtilleryGunner
            "range": 6400,
            "team": "W"
        },
        "Bomber": {
            "range": 6800,
            "team": "W"
        },
        "Transport": {
            "range": 6800,
            "team": "W"
        },
        "Custom Plane": {
            "range": 7200, // Custom guns will have these set by the user
            "team": "W"
        }
    }

    range = null
    minRange = 0;
    maxRange = 0;
    buffer = 10

    inputRange = null
    inputBuffer = null

    editFeature = null

    /**
     * @param {EditTools}  tools
     * @param {import("ol").Map} map
     */
    constructor(tools, map) {
        this.map = map
        this.tools = tools

        const offcanvas = document.getElementById('sidebarAirRange')
        this.bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvas, {
            keyboard: true,
            backdrop: false,
            scroll: true
        })
        offcanvas.addEventListener('hide.bs.offcanvas', () => {
            tools.edit.controlElement.classList.remove('selected')
            tools.changeMode(false)
            //this.artyModeDisabled()
        })

        document.getElementById('airrange-close').onclick = this.artyHide;

        const planeSelector = document.getElementById("planeSelector")

        for (let p in this.planes) {
            let newLi = document.createElement('li')
            let newPiece = document.createElement('a')

            newPiece.classList.add('dropdown-item')
            newPiece.href = '#'
            newPiece.innerText = p
            newPiece.onclick = () => this.selectPlane(p)

            newLi.appendChild(newPiece)
            planeSelector.appendChild(newLi)
        }

        this.inputRange = document.getElementById('range')
        this.inputRange.addEventListener('change', (e) => {
            this.range = parseFloat(e.target.value);
            this.setRange()
        })

        this.inputBuffer =  document.getElementById('buffer')
        this.inputBuffer.addEventListener('change', (e) => {
            this.buffer = parseFloat(e.target.value);
            this.setRange()
        })

        const vectorSource = new VectorSource({
            features: new Collection(),
            type: 'arty'
        })
        this.vectorSource = vectorSource

        const vector = new VectorLayer({
            source: vectorSource,
            style: {
                'fill-color': 'rgba(255, 255, 255, 0.0)',
                'stroke-color': '#000000',
                'stroke-width': 2,
                'circle-radius': 7,
                'circle-fill-color': '#ffcc33',
            },
            zIndex: Infinity,
            visible: false
        });
        this.vector = vector;


        const iconStyle = new Style({
            image: new Icon({
                anchor: [0.5, 64],
                anchorXUnits: 'fraction',
                anchorYUnits: 'pixels',
                src: '/images/artilleryChevron.svg',
                //color: '#274a21',
                //Faction neutral color until I figure out how to access config's basic color
                scale: .35,
            }),
        });

        const sender = new Feature({
            geometry: new Point(map.getView().getCenter()),
            type: 'radius',
        });
        this.sender = sender;

        const minRadiusStyle = new Style({
            stroke: new Stroke({
                width: 2,
                color: [255, 255, 255, 0],
            }),
            fill: new Fill({
                color: [0, 0, 0, .2],
            })
        })
        const maxRadiusStyle = new Style({
            stroke: new Stroke({
                width: 2,
                color: [255, 255, 255, 0],
            }),
            fill: new Fill({
                color: [200, 40, 40, .2],
            }),
            geometry: (feature) => {
                // Render only the annulus (outer ring) by subtracting the min radius from the max
                const geom = feature.getGeometry();
                if (!geom || typeof geom.getCenter !== 'function' || !this.minRadius) {
                    return geom; // fallback
                }
                const center = geom.getCenter();
                // Outer circle polygon
                const outerPoly = fromCircle(geom, 64);
                // Inner circle polygon (hole)
                const innerCircle = new Circle(center, this.minRadius.getGeometry().getRadius());
                const innerPoly = fromCircle(innerCircle, 64);
                const outerRing = outerPoly.getCoordinates()[0];
                const innerRing = innerPoly.getCoordinates()[0];
                // Create polygon with a hole
                return new Polygon([outerRing, innerRing]);
            }
        })

        const minRadius = new Feature({
            geometry: new Circle(map.getView().getCenter(), 0),
            type: 'radius'
        });
        this.minRadius = minRadius
        this.minRadius.setStyle(minRadiusStyle)

        const maxRadius = new Feature({
            geometry: new Circle(map.getView().getCenter(), 0),
            type: 'radius'
        });
        this.maxRadius = maxRadius
        this.maxRadius.setStyle(maxRadiusStyle)

        const translateSender = new Translate({
            hitTolerance: 10,
            features: new Collection([sender]),
        })
        translateSender.on("translating", this.translating)
        map.addInteraction(translateSender);

        sender.setStyle(iconStyle);

        vectorSource.addFeature(maxRadius);
        vectorSource.addFeature(minRadius);
        vectorSource.addFeature(sender);

        map.addLayer(vector);

        tools.on(tools.EVENT_ARTY_MODE_ENABLED, this.artyModeEnabled)
        tools.on(tools.EVENT_ARTY_MODE_DISABLED, this.artyModeDisabled)

        this.selectPlane(Object.keys(this.planes)[0]) //select first gun by default
    }

    translating = () => {
        this.minRadius.getGeometry().setCenter(this.sender.getGeometry().getCoordinates())
        this.maxRadius.getGeometry().setCenter(this.sender.getGeometry().getCoordinates())
    }

    selectPlane(plane) {
        document.getElementById("airRangePieceButton").innerText = plane

        if (plane === 'Custom Plane') {
            document.getElementById('custom-plane-input').style.display = 'block';
        } else {
            document.getElementById('custom-plane-input').style.display = 'none';
            this.inputRange.value = this.planes[plane].range;
            this.range = this.planes[plane].range;
        }
        this.setRange()
    }

    setRange() {
        this.minRange = this.range * this.tools.MAGIC_MAP_SCALING_FACTOR * (0.5 - this.buffer / 100);
        this.maxRange = this.range * this.tools.MAGIC_MAP_SCALING_FACTOR;
        this.minRadius.getGeometry().setRadius(this.minRange);
        this.maxRadius.getGeometry().setRadius(this.maxRange);
    }

    // Updates arty icons to center of screen when reopening arty tab
    reCenterIconsOnShow = (vectorSource) => {
        vectorSource.forEachFeature(feature => {
            if (feature.getGeometry().getType() === 'Point') {
                feature.getGeometry().setCoordinates(this.map.getView().getCenter())
            }
        });
        this.translating()
    }


    artyShow = () => {
        this.vector.setVisible(true);
        this.reCenterIconsOnShow(this.vectorSource);
    }

    artyHide = () => {
        this.vector.setVisible(false);
    }

    artyModeEnabled = () => {
        this.bsOffcanvas.show();
        this.vector.setVisible(true);
    }

    artyModeDisabled = () => {
        this.bsOffcanvas.hide()
        this.vector.setVisible(false);
    }

}

export default SidebarAirRange