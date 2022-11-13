const {Style, Icon} = require("ol/style");
const TomSelect = require("tom-select");
const AIconTool = require("./AIconTool");

class Signs extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'sign', 'sign-turn-left', {
      title: 'Signs',
      zIndex: 10,
      left: '2em',
    });

    this.signSelect = new TomSelect('#sign-form-sign', {
      render: {
        option: (data, escape) => {
          return `<div><img src="${this.getImageUrl(data.value)}" alt="${data.text}"></div>`;
        },
        item: (data, escape) => {
          return `<div><img src="${this.getImageUrl(data.value)}" alt="${data.text}"></div>`;
        }
      }
    })
    this.signSelect.on('change', () => {
      if (this.draw) {
        this.draw.changed()
      }
    })
  }

  style = (feature, zoom) => {
    const sign = feature.get('sign') || this.signSelect.getValue();
    return new Style({
      image: new Icon({
        src: this.getImageUrl(sign),
      }),
    })
  }

  toolRightClick = () => {
    this.tools.changeTool(false);
  }

  setFeatureProperties = (feature) => {
    feature.set('sign', this.signSelect.getValue());
  };

  clearInput() {
    this.signSelect.setValue('dead_end');
  }

  featureSelected = (feature) => {
    this.signSelect.setValue(feature.get('sign'))
  }

}

module.exports = Signs