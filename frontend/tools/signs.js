const ADrawTool = require("./ADrawTool");
const {Style, Icon} = require("ol/style");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Draw} = require("ol/interaction");
const TomSelect = require("tom-select");

class Signs extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'sign', 'exclamation-triangle', {
      title: 'Signs'
    });

    this.collection = new Collection([]);
    const source = new VectorSource({
      features: this.collection,
    });

    const vector = new Vector({
      source: source,
      title: 'Signs',
      style: this.style,
      zIndex: 10,
    });
    this.map.addLayer(vector);

    this.form = document.getElementById('sign-form');
    this.signSelect = new TomSelect('#sign-form-sign', {
      render: {
        option: (data, escape) => {
          return `<div><img src="${this.getSignImageUrl(data.value)}" alt="${data.text}"></div>`;
        },
        item: (data, escape) => {
          return `<div><img src="${this.getSignImageUrl(data.value)}" alt="${data.text}"></div>`;
        }
      }
    })
    this.signSelect.on('change', () => {
      this.draw.changed()
    })
    this.notesInput = document.getElementById('sign-form-notes');
    this.submitButton = document.getElementById('sign-form-submit');
    this.cancelButton = document.getElementById('sign-form-cancel');

    this.cancelButton.addEventListener('click', this.clearInput)
  }

  style = (feature, zoom) => {
    const sign = feature.get('sign') || this.signSelect.getValue();
    return new Style({
      image: new Icon({
        src: this.getSignImageUrl(sign),
      }),
    })
  }

  toolSelected = () => {
    this.draw = new Draw({
      type: 'Point',
      style: this.style,
      condition: (event) => {
        if (event.type === 'pointerdown') {
          // Right click cancels tool selection
          if (event.originalEvent.button === 2) {
            this.tools.changeTool(false);
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
    this.draw.on('drawend', (event) => {
      const feature = event.feature
      feature.set('type', this.toolName)
      feature.set('sign', this.signSelect.getValue());
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
    this.signSelect.setValue('warning')
    this.notesInput.value = ''
  }

  getSignImageUrl = (sign) => {
    switch (sign) {
      default:
        return 'images/' + sign + '_sign.svg'

      case 'dead_end':
      case 'dual_carriageway_ends_ahead':
      case 'information':
      case 'keep_left':
      case 'keep_right':
      case 'level_crossing':
      case 'maintenance':
      case 'motorway':
      case 'motorway_end':
      case 'no_stopping':
      case 'no_waiting':
      case 'parking':
        return 'images/' + sign + '.svg'
    }
  }

}

module.exports = Signs