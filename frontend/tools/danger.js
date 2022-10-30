const ADrawTool = require("./ADrawTool");
const {Style, Icon} = require("ol/style");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Draw} = require("ol/interaction");

class Danger extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'danger', 'exclamation-octagon', {
      title: 'Danger'
    });

    this.style = new Style({
      image: new Icon({
        src: 'images/alert.png',
      }),
    });
    this.collection = new Collection([]);
    const source = new VectorSource({
      features: this.collection,
    });

    const vector = new Vector({
      source: source,
      title: 'Danger',
      style: this.style,
    });
    this.map.addLayer(vector);
  }

  toolSelected = () => {
    this.draw = new Draw({
      type: 'Point',
      style: this.style,
    });
    this.draw.on('drawend', (event) => {
      const feature = event.feature
      feature.set('type', this.toolName)
      feature.set('notes', '')
      this.tools.emit(this.tools.EVENT_ICON_ADDED, feature)
    })
    this.map.addInteraction(this.draw);
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.draw)
  }

  clearIcons = () => {
    this.collection.clear()
  }

  addIcon = (icon) => {
    this.collection.push(icon)
  }

}

module.exports = Danger