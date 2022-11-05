const ADrawTool = require("./ADrawTool");
const {Style, Stroke, Fill, Text} = require("ol/style");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Draw} = require("ol/interaction");
const {createEditingStyle} = require("ol/style/Style");

class CustomFacility extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'custom_facility', 'hexagon', {
      title: 'Custom Facilities',
      left: '2em',
    });

    this.collection = new Collection([]);
    const source = new VectorSource({
      features: this.collection,
    });

    const vector = new Vector({
      source: source,
      title: 'Facilities',
      style: this.style,
      zIndex: 5,
    });
    this.map.addLayer(vector);

    this.form = document.getElementById('custom-facility-form');
    this.notesInput = document.getElementById('custom-facility-form-notes');
    this.submitButton = document.getElementById('custom-facility-form-submit');
    this.cancelButton = document.getElementById('custom-facility-form-cancel');

    this.cancelButton.addEventListener('click', this.clearInput)
  }

  editingStyles = createEditingStyle();

  /**
   *
   * @param {import("ol").Feature} feature
   * @param zoom
   * @returns {Style}
   */
  style = (feature, zoom) => {
    if (feature.getGeometry().getType() === 'Polygon') {
      return new Style({
        stroke: new Stroke({
          color: 'rgba(85,85,85,0.52)',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(85,85,85,0.52)',
        }),
        text: new Text({
          font: '1rem system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          text: feature.get('notes') || this.notesInput.value,
          fill: new Fill({
            color: '#FFFFFF',
          })
        })
      })
    }
    else {
      return this.editingStyles[feature.getGeometry().getType()]
    }
  }

  toolSelected = () => {
    this.draw = new Draw({
      type: 'Polygon',
      style: this.style,
      condition: (event) => {
        if (event.type === 'pointerdown') {
          // Right click cancels tool selection
          if (event.originalEvent.button === 2) {
            this.draw.removeLastPoint()
            return false
          }
          // Left click add new point
          else if (event.originalEvent.button === 0) {
            return true
          }
        }
        return false
      },
    });
    this.draw.on('drawstart', (event) => {
      event.feature.set('type', this.toolName)
    })
    this.draw.on('drawend', (event) => {
      const feature = event.feature
      feature.set('notes', this.notesInput.value)
      this.tools.emit(this.tools.EVENT_ICON_ADDED, feature)
    })
    this.map.addInteraction(this.draw);
    this.form.style.display = 'block';
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.draw)
    this.clearInput()
    this.form.style.display = 'none';
  }

  clearIcons = () => {
    this.collection.clear()
  }

  addIcon = (icon) => {
    this.collection.push(icon)
  }

  clearInput = () => {
    this.notesInput.value = ''
  }

}

module.exports = CustomFacility