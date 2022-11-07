const AIconTool = require("./AIconTool");
const {Style, Icon} = require("ol/style");
const TomSelect = require("tom-select");

class Facilities extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'facility', 'building', {
      title: 'Facilities',
      zIndex: 15,
    });

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
    this.iconSelect.on('change', () => {
      if (this.draw) {
        this.draw.changed()
      }
    })
  }

  style = (feature, zoom) => {
    const icon = feature.get('icon') || this.iconSelect.getValue();
    return new Style({
      image: new Icon({
        src: this.getFacilityImageUrl(icon),
      }),
    })
  }

  toolRightClick = () => {
    this.tools.changeTool(false);
  }

  setFeatureProperties = (feature) => {
    feature.set('icon', this.iconSelect.getValue());
  }

  clearInput() {
    this.iconSelect.setValue('public_cmats')
  }

  getFacilityImageUrl = (sign) => {
    switch (sign) {
      default:
        return 'images/' + sign + '.svg'
    }
  }

  featureSelected = (feature) => {
    this.iconSelect.setValue(feature.get('icon'))
  }

}

module.exports = Facilities