import { Collection } from "ol";
import Feature from "ol/Feature.js";
import { Circle } from "ol/geom.js";
import LineString from "ol/geom/LineString.js";
import Point from "ol/geom/Point.js";
import Translate from "ol/interaction/Translate.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import Fill from "ol/style/Fill.js";
import Icon from "ol/style/Icon.js";
import Stroke from "ol/style/Stroke.js";
import Style from "ol/style/Style.js";


class SidebarArty {

  artilleryList = {
    "Cremari Mortar": { // BPMortarItemComponent_C / Mortar
      "min": 45, // MinDistance
      "max": 80, // MaxDistance
      "minAcc": 5.5, // ArtilleryAccuracyMinDist
      "maxAcc": 12.0, // ArtilleryAccuracyMaxDist
      "offset": 2, // AccuracyRadius (from ammo)
      "ammo": "Mortar Shell", // MortarAmmo
      "team": "N"
    },
    "Peltast / Devitt-Caine Mk. IV MMR" : { // HalfTrackMortarGunner - not buildable
      "min": 45,
      "max": 80,
      "minAcc": 2.50,
      "maxAcc": 9.45,
      "offset": 2,
      "ammo": "Mortar Shell", // MortarAmmo
      "team": "N"
    },
    "Gunship": { // GunboatOffensiveWArtilleryGunner
      "min": 50,
      "max": 100,
      "minAcc": 2.5,
      "maxAcc": 14.5,
      "offset": 2,
      "ammo": "Mortar Shell", // MortarAmmo
      "team": "N"
    },
    "Koronides": { // ArtilleryGunner
      "min": 100,
      "max": 250,
      "minAcc": 22.50,
      "maxAcc": 30,
      "offset": 40,
      "ammo": "120mm", // LightArtilleryAmmo
      "team": "C"
    },
    "Huber Lariat": { // EmplacedLightArtilleryWGunner
      "min": 100,
      "max": 300,
      "minAcc": 25,
      "maxAcc": 35,
      "offset": 40,
      "ammo": "120mm", // LightArtilleryAmmo
      "team": "W"
    },
    "Large Ship 120mm": { // 120mm guns found on Frigates, Destroyers, and Battleships 
      "min": 100,
      "max": 200,
      "minAcc": 2.5,
      "maxAcc": 8.5,
      "offset": 40,
      "ammo": "120mm", // LightArtilleryAmmo
      "team": "N"
    },
    "Trident 120mm": { // The Trident fires 120mm but has most of the stats of a 150mm
      "min": 100,
      "max": 225,
      "minAcc": 2.5,
      "maxAcc": 8.5,
      "offset": 40,
      "ammo": "120mm", // LightArtilleryAmmo
      "team": "C"
    },
    "Thunderbolt": { // EmplacedHeavyArtilleryCGunner
      "min": 200,
      "max": 350,
      "minAcc": 32.5,
      "maxAcc": 40,
      "offset": 40,
      "ammo": "150mm", // HeavyArtilleryAmmo
      "team": "C"
    },
    "Huber Exalt": { // EmplacedHeavyArtilleryWGunner
      "min": 100,
      "max": 300,
      "minAcc": 25,
      "maxAcc": 35,
      "offset": 40,
      "ammo": "150mm", // HeavyArtilleryAmmo
      "team": "W"
    },
    "Large Ship 150mm": { // 150mm guns found on the Callahan and on the Titan
      "min": 100,
      "max": 225,
      "minAcc": 2.5,
      "maxAcc": 8.5,
      "offset": 40,
      "ammo": "150mm", // HeavyArtilleryAmmo
      "team": "N"
    },
    "Self Propelled Gun": { // 150mm guns found on the Sarissa and on the Stain
      "min": 120,
      "max": 250,
      "minAcc": 25,
      "maxAcc": 35,
      "offset": 40,
      "ammo": "150mm", // HeavyArtilleryAmmo
      "team": "N"
    },
    "Hades' Net": { // EmplacedMultiCGunner
      "min": 200,
      "max": 425,
      "minAcc": 25,
      "maxAcc": 41.5,
      "offset": 25, // works but guessed
      "ammo": "3C-HE", // HERocketAmmo
      "team": "C"
    },
    "Retiarius": { // TruckMultiCGunner
      "min": 225,
      "max": 350,
      "minAcc": 25,
      "maxAcc": 41.5,
      "offset": 25, // works but guessed
      "ammo": "3C-HE", // HERocketAmmo
      "team": "C"
    },
    "King Jester Mk. I-1": { // ScoutTankMultiWGunner
      "min": 200,
      "max": 350,
      "minAcc": 30,
      "maxAcc": 41.5,
      "offset": 25, // works but guessed
      "ammo": "3C-HE", // HERocketAmmo
      "team": "W"
    },
    "Wasp Nest": { // FieldMultiWGunner
      "min": 225,
      "max": 300,
      "minAcc": 25,
      "maxAcc": 37.5,
      "offset": 25, // works but guessed
      "ammo": "4C-Fire Rocket", // FireRocketAmmo
      "team": "W"
    },
    "Skycaller": { // HalftrackMultiWGunner
      "min": 200,
      "max": 275,
      "minAcc": 25,
      "maxAcc": 37.5,
      "offset": 25, // works but guessed
      "ammo": "4C-Fire Rocket", // FireRocketAmmo
      "team": "W"
    },
    "Deioneus": { // TanketteMultiCGunner
      "min": 250,
      "max": 300,
      "minAcc": 30,
      "maxAcc": 41.5,
      "offset": 25, // works but guessed
      "ammo": "4C-Fire Rocket", // FireRocketAmmo
      "team": "C"
    },
    "Tempest": { // LongRangeArtilleryTrainGunner
      "min": 350,
      "max": 500,
      "minAcc": 50, // Sourced from the wiki
      "maxAcc": 50, // Sourced from the wiki
      "offset": 50,
      "ammo": "300mm", // LRArtilleryAmmo
      "team": "N"
    },
    "Storm Cannon": { // LongRangeArtillery
      "min": 400,
      "max": 1000,
      "minAcc": 50, // Sourced from the wiki
      "maxAcc": 50, // Sourced from the wiki
      "offset": 50,
      "ammo": "300mm", // LRArtilleryAmmo
      "team": "N"
    },
    "Intelligence Center": { // Precision radius represents intel collection radius
      "min": 500,
      "max": 2000,
      "minAcc": 250, 
      "maxAcc": 120, 
      "offset": 0,
      "ammo": "Special", // Eavesdropping juice
      "team": "N"
    },
    "A0E-9 Rocket": { // Precision radius represents destruction radius
      "min": 0,
      "max": 2000,
      "minAcc": 80, 
      "maxAcc": 80, 
      "offset": 0,
      "ammo": "Special", // Big rocket
      "team": "N"
    }
  }

  windStrength = 0;
  windDirection = 0;
  windOffset = 0;

  targetWindOffsetX = 0;
  targetWindOffsetY = 0;

  targetWindOffsetXSingle = 0;
  targetWindOffsetYSingle = 0;

  solutionDistance = 0;
  solutionAzimuth = 0;


  editFeature = null

  /**
   * @param {EditTools}  tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.tools = tools

    const offcanvas = document.getElementById('sidebarArty')
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

    document.getElementById('arty-close').onclick = this.artyHide;

    document.getElementById('solutionCopy').onclick = this.copySolution;

    const artySelector = document.getElementById("artyPieceSelector")
    let shellType = ''

    for (let p in this.artilleryList) {
      this.artilleryList[p].min *= this.tools.MAGIC_MAP_SCALING_FACTOR
      this.artilleryList[p].max *= this.tools.MAGIC_MAP_SCALING_FACTOR

      //header handling
      if (shellType !== this.artilleryList[p].ammo) {

        let newLiH = document.createElement('li')
        let newHead = document.createElement('h5')
        newHead.classList.add('dropdown-header')
        newHead.innerText = this.artilleryList[p].ammo

        newLiH.appendChild(newHead)
        artySelector.appendChild(newLiH)
      }
      shellType = this.artilleryList[p].ammo

      let newLi = document.createElement('li')
      let newPiece = document.createElement('a')

      newPiece.classList.add('dropdown-item')
      newPiece.href = '#'
      newPiece.innerText = p
      newPiece.onclick = () => this.selectGun(p)

      newLi.appendChild(newPiece)
      artySelector.appendChild(newLi)
    }

    this.g = this.artilleryList["Tube Mortars"];

    //this is silly but oh well
    document.getElementById("ws0").onclick = () => this.setWindStr();
    document.getElementById("ws1").onclick = () => this.setWindStr();
    document.getElementById("ws2").onclick = () => this.setWindStr();
    document.getElementById("ws3").onclick = () => this.setWindStr();
    document.getElementById("ws4").onclick = () => this.setWindStr();
    document.getElementById("ws5").onclick = () => this.setWindStr();

    //document.getElementById("wd0").onchange= () => this.setWindDir();
    document.getElementById("wd0").onchange = () => this.setWindDir();
    document.getElementById("wd0").onwheel = () => this.setWindDir();
    //document.getElementById("wd0").onwheel= () => this.setWindDir();

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

    const windVectorLayer = new VectorSource({
      features: new Collection(),
      type: 'arty'
    })
    this.windVectorLayer = windVectorLayer

    const windLayer = new VectorLayer({
      source: windVectorLayer,
      zIndex: Infinity,
      visible: false
    });
    this.windLayer = windLayer;

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

    const iconTarget = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: '/images/artilleryTarget.svg',
        color: '#FFFFFF',
        scale: 1,
      }),
    });

    const iconVector = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: '/images/artilleryVector.svg',
        color: '#FFFFFF',
        scale: 1,
      }),
    });

    const iconWindDir = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: '/images/artilleryWindDir.svg',
        color: '#FFFFFF',
        scale: .5,
        rotation: -90
      }),
    });

    const iconWindPip = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: '/images/artilleryWindPip.svg',
        color: '#FFFFFF',
        scale: .25,
        rotation: 0
      }),
    });

    const gunVectorStyle = new Style({
      stroke: new Stroke({
        width: 2,
        color: [0, 0, 0, 1],
        lineDash: [0, 8, 4, 8]
      })
    })

    const windVectorStyle = new Style({
      stroke: new Stroke({
        width: 2,
        color: [255, 255, 255, 1],

      })
    })

    const precisionRadiusStyle = new Style({
      stroke: new Stroke({
        width: 2,
        color: [255, 255, 255, 0],

      }),
      fill: new Fill({
        color: [0, 0, 0, .2],

      })
    })

    const sender = new Feature({
      geometry: new Point(map.getView().getCenter()),
      type: 'radius',
    });
    this.sender = sender;

    const target = new Feature({
      geometry: new Point(map.getView().getCenter()),
      type: 'radius',
    });
    this.target = target;

    const targetWind = new Feature({
      geometry: new Point(map.getView().getCenter()),
      type: 'radius'
    });
    this.targetWind = targetWind

    const dirWind = new Feature({
      geometry: new Point(map.getView().getCenter()),
      type: 'radius'
    });
    this.dirWind = dirWind

    const windPips = [5];
    for (let i = 0; i < 5; i++) {
      windPips[i] = new Feature({
        geometry: new Point([0, 0]),
        type: 'radius',
        style: iconWindPip
      })
      windPips[i].setStyle(iconWindPip)
      this.windVectorLayer.addFeature(windPips[i])
    }
    this.windPips = windPips;


    const vectorSolution = new Feature({
      geometry: new LineString([[0, 0], [0, 0]]),
      type: 'radius'
    });
    this.vectorSolution = vectorSolution

    const vectorWindOffsets = new Feature({
      geometry: new LineString([[0, 0], [0, 0]]),
      type: 'radius'
    });
    this.vectorWindOffsets = vectorWindOffsets

    const minRadius = new Feature({
      geometry: new Circle(map.getView().getCenter(), 0),
      type: 'radius'
    });
    this.minRadius = minRadius

    const maxRadius = new Feature({
      geometry: new Circle(map.getView().getCenter(), 0),
      type: 'radius'
    });
    this.maxRadius = maxRadius

    const precisionRadius = new Feature({
      geometry: new Circle(map.getView().getCenter(), 0),
      type: 'radius'
    });
    this.precisionRadius = precisionRadius

    const translateTarget = new Translate({
      hitTolerance: 10,
      features: new Collection([target]),
    })
    translateTarget.on("translating", this.translating)
    const translateSender = new Translate({
      hitTolerance: 10,
      features: new Collection([sender]),
    })
    translateSender.on("translating", this.translating)
    map.addInteraction(translateTarget);
    map.addInteraction(translateSender);

    sender.setStyle(iconStyle);
    target.setStyle(iconTarget);
    targetWind.setStyle(iconVector);
    dirWind.setStyle(iconWindDir);
    vectorSolution.setStyle(gunVectorStyle);
    vectorWindOffsets.setStyle(windVectorStyle);
    precisionRadius.setStyle(precisionRadiusStyle);

    vectorSource.addFeature(maxRadius);
    vectorSource.addFeature(minRadius);
    vectorSource.addFeature(precisionRadius);
    vectorSource.addFeature(sender);
    vectorSource.addFeature(target);
    vectorSource.addFeature(targetWind);
    windVectorLayer.addFeature(dirWind);

    vectorSource.addFeature(vectorSolution);
    windVectorLayer.addFeature(vectorWindOffsets);

    map.addLayer(vector);
    map.addLayer(windLayer);

    tools.on(tools.EVENT_ARTY_MODE_ENABLED, this.artyModeEnabled)
    tools.on(tools.EVENT_ARTY_MODE_DISABLED, this.artyModeDisabled)
  }

  translating = () => {
    this.minRadius.getGeometry().setCenter(this.sender.getGeometry().getCoordinates())
    this.maxRadius.getGeometry().setCenter(this.sender.getGeometry().getCoordinates())
    this.precisionRadius.getGeometry().setCenter(this.target.getGeometry().getCoordinates())

    this.calcWind();
  }

  selectGun(gun) {
    document.getElementById("artyPieceButton").innerText = gun

    this.g = this.artilleryList[gun];
    //console.log("gunstats asd " +this.g.toString() + "Max:" + this.g.max);

    this.minRadius.getGeometry().setRadius(this.artilleryList[gun].min);
    this.maxRadius.getGeometry().setRadius(this.artilleryList[gun].max);
    this.setWindOff();
  }

  setWindStr = () => {
    this.windStrength = parseInt(document.querySelector('input[name="windStrength"]:checked').value)

    if (this.windStrength === 0) {
      this.windLayer.setVisible(false);
    } else {
      this.windLayer.setVisible(true);
    }

    this.calcWind();
  }

  setWindDir = () => {

    //makes scrolling and arrow buttons loop, most of the time
    if (document.getElementById("wd0").value >= 360) {
      document.getElementById("wd0").value = 0;
    } else if (document.getElementById("wd0").value <= 0) {
      document.getElementById("wd0").value = 360;
    }

    this.windDirection = document.getElementById("wd0").value


    //converting angle angles to compass angles
    /*
    this.windDirection = this.windDirection - 90;
    if (this.windDirection < 0){
      this.windDirection = this.windDirection + 360
    }
    this.windDirection = 360 - this.windDirection;
    */

    this.calcWind();
  }

  setScatterViz = () => {
    let scatter = (((this.g.maxAcc - this.g.minAcc) / (this.g.max - this.g.min)) * ((this.vectorSolution.getGeometry().getLength()) - this.g.min) + this.g.minAcc);
    this.precisionRadius.getGeometry().setRadius(scatter);

    if (this.vectorSolution.getGeometry().getLength() > this.g.max) {
      this.precisionRadius.getGeometry().setRadius(this.g.maxAcc);
    }
    if (this.vectorSolution.getGeometry().getLength() < this.g.min) {
      this.precisionRadius.getGeometry().setRadius(this.g.minAcc);
    }
  }

  setWindOff = () => {
    this.windOffset = this.artilleryList[document.getElementById("artyPieceButton").innerText].offset
    this.calcWind();
  }

  calcWind = () => {

    this.targetWindOffsetY = this.windStrength * this.windOffset * Math.cos(this.windDirection * (Math.PI / 180))
    this.targetWindOffsetX = this.windStrength * this.windOffset * Math.sin(this.windDirection * (Math.PI / 180))

    this.targetWind.getGeometry().setCoordinates([this.target.getGeometry().getCoordinates()[0] - this.targetWindOffsetX, this.target.getGeometry().getCoordinates()[1] - this.targetWindOffsetY])


    this.targetWindOffsetYSingle = this.windOffset * Math.cos(this.windDirection * (Math.PI / 180))
    this.targetWindOffsetXSingle = this.windOffset * Math.sin(this.windDirection * (Math.PI / 180))

    this.vectorWindOffsets.getGeometry().setCoordinates([[this.target.getGeometry().getCoordinates()[0] + this.targetWindOffsetXSingle * 1, this.target.getGeometry().getCoordinates()[1] + this.targetWindOffsetYSingle * 1], this.target.getGeometry().getCoordinates()]);

    this.dirWind.getGeometry().setCoordinates([this.target.getGeometry().getCoordinates()[0] + this.targetWindOffsetXSingle * 1, this.target.getGeometry().getCoordinates()[1] + this.targetWindOffsetYSingle * 1]);
    this.dirWind.getStyle().getImage().setRotation(this.windDirection * (Math.PI / 180));

    for (let i = 1; i < 6; i++) {
      const newCoord = [this.target.getGeometry().getCoordinates()[0] - this.targetWindOffsetXSingle * i, this.target.getGeometry().getCoordinates()[1] - this.targetWindOffsetYSingle * i]
      this.vectorWindOffsets.getGeometry().appendCoordinate(newCoord);

      this.windPips[i - 1].getGeometry().setCoordinates(newCoord);
    }

    this.calcVector();
    this.setScatterViz();

  }

  calcVector = () => {

    this.vectorSolution.getGeometry().setCoordinates([this.sender.getGeometry().getCoordinates(), this.targetWind.getGeometry().getCoordinates()])

    //what we've all been waiting for
    this.solutionDistance = this.vectorSolution.getGeometry().getLength() / this.tools.MAGIC_MAP_SCALING_FACTOR
    document.getElementById('solutionD').innerHTML = String(Math.round(this.solutionDistance)).padStart(3, '0');


    //I hate angles
    this.solutionAzimuth = Math.atan2(this.targetWind.getGeometry().getCoordinates()[1] - this.sender.getGeometry().getCoordinates()[1], this.targetWind.getGeometry().getCoordinates()[0] - this.sender.getGeometry().getCoordinates()[0])

    this.solutionAzimuth = this.solutionAzimuth * (180 / Math.PI)

    this.solutionAzimuth = (this.solutionAzimuth + 360) % 360

    this.solutionAzimuth = -(this.solutionAzimuth - 90 % 360)
    if (this.solutionAzimuth < 0) {
      this.solutionAzimuth = 360 + this.solutionAzimuth
    }


    //console.log (Config.basic.color);
    document.getElementById('solutionA').innerHTML = String(this.solutionAzimuth.toFixed(1)).padStart(5, '0');

  }

  copySolution = () => {
    let text = `Dist: ${document.getElementById('solutionD').innerHTML} Azim: ${document.getElementById('solutionA').innerHTML}`
    navigator.clipboard.writeText(text);

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
    if (this.windStrength) {
      this.windLayer.setVisible(true);
      this.reCenterIconsOnShow(this.windVectorLayer);
    }
  }

  artyHide = () => {
    this.vector.setVisible(false);
    this.windLayer.setVisible(false);
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

export default SidebarArty