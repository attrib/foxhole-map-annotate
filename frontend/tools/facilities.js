const ADrawTool = require("./ADrawTool");
const {Style, Icon} = require("ol/style");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Draw} = require("ol/interaction");
const TomSelect = require("tom-select");

class Facilities extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'facility', 'building', {
      title: 'Facilities'
    });

    this.collection = new Collection([]);
    const source = new VectorSource({
      features: this.collection,
    });

    const vector = new Vector({
      source: source,
      title: 'Facilities',
      style: this.style,
      zIndex: 10,
    });
    this.map.addLayer(vector);

    this.form = document.getElementById('facility-form');
    this.iconSelect = new TomSelect('#facility-form-icon', {
      render: {
        option: (data, escape) => {
          return `<div><img src="${this.getFacilityImageUrl(data.value)}" alt="${data.text}"> ${data.text}</div>`;
        },
        item: (data, escape) => {
          return `<div><img src="${this.getFacilityImageUrl(data.value)}" alt="${data.text}"> ${data.text}</div>`;
        }
      }
    })
    this.iconSelect.on('change', (a,b,c) => {
      if (this.draw) {
        this.draw.changed()
      }
    })
    this.notesInput = document.getElementById('facility-form-notes');
    this.submitButton = document.getElementById('facility-form-submit');
    this.cancelButton = document.getElementById('facility-form-cancel');

    this.cancelButton.addEventListener('click', this.clearInput)
  }

  style = (feature, zoom) => {
    const icon = feature.get('icon') || this.iconSelect.getValue();
    return new Style({
      image: new Icon({
        src: this.getFacilityImageUrl(icon),
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
      feature.set('icon', this.iconSelect.getValue());
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
    this.iconSelect.setValue('public_cmats')
    this.notesInput.value = ''
  }

  getFacilityImageUrl = (sign) => {
    switch (sign) {
      default:
        return 'images/' + sign + '.svg'
    }
  }

}

module.exports = Facilities