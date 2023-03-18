const {createCustomControlElement} = require("./mapControls");
const {Control} = require("ol/control");
const {Draw} = require("ol/interaction");
const {Overlay} = require("ol");
const {unByKey} = require("ol/Observable");

class Measure {

  /**
   * @param {EditTools}  tools
   * @param {import("ol").Map} map
   */
  constructor(map, tools) {
    this.map = map
    this.MAGIC_MAP_SCALING_FACTOR = tools.MAGIC_MAP_SCALING_FACTOR
    const controlElement = createCustomControlElement('rulers', (e, selected) => {
      if (selected) {
        this.displayRuler()
      }
      else {
        this.removeRuler()
      }
    }, {
      elementClass: 'ruler-button',
      title: 'Toggle Ruler',
    })
    const control = new Control({
      element: controlElement
    })
    map.addControl(control)
    this.ruler = new Draw({
      type: 'LineString',
    })
    this.ruler.on('drawstart', (event) => {
      // set sketch
      this.sketch = event.feature;
      this.sketch.set('type', 'ruler')

      /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
      let tooltipCoord = event.coordinate;

      this.listener = this.sketch.getGeometry().on('change', (evt) => {
        const geom = evt.target;
        let output = this.formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
        this.measureTooltipElement.innerHTML = output;
        this.measureTooltip.setPosition(tooltipCoord);
      });
    })
    this.ruler.on('drawend', (event) => {
      this.measureTooltip.setPosition(undefined)
      this.sketch = null
      unByKey(this.listener);
    })

    this.measureTooltipElement = document.createElement('div');
    this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    this.measureTooltip = new Overlay({
      element: this.measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center',
      stopEvent: false,
      insertFirst: false,
    });
    map.addOverlay(this.measureTooltip);
  }

  displayRuler = () => {
    this.map.addInteraction(this.ruler)
  }

  removeRuler = () => {
    this.map.removeInteraction(this.ruler)
  }

  /**
   * @param {import("ol/geom").LineString} line
   * @returns {string}
   */
  formatLength = (line) => {
    let length = 0;
    const coordinates = line.getCoordinates()
    for (let i = 0; i < coordinates.length - 1; i++) {
      length += Math.sqrt(Math.pow(coordinates[i][0] - coordinates[i+1][0], 2) + Math.pow(coordinates[i][1] - coordinates[i+1][1], 2))
    }
    length = length / this.MAGIC_MAP_SCALING_FACTOR;
    if (coordinates.length === 2) {
      let azi = (((Math.atan2(coordinates[0][0] - coordinates[1][0], coordinates[0][1] - coordinates[1][1]) *(180/Math.PI))+360)%360)-180
      if (azi < 0) {
        azi += 360
      }
      return Math.round(length) + 'm ' + azi.toFixed(1) + '°';
    }
    return Math.round(length) + 'm';
  };


}

module.exports = Measure