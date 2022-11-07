const AIconTool = require("./AIconTool");
const {Style, Stroke, Fill, Text} = require("ol/style");
const {createEditingStyle} = require("ol/style/Style");

class CustomFacility extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'custom-facility', 'hexagon', {
      title: 'Custom Facilities',
      left: '2em',
      zIndex: 5,
      drawType: 'Polygon',
    });
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
      const notes = feature.get('notes') === undefined ? this.notesInput.value : feature.get('notes')
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
          text: notes,
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

  toolRightClick = () => {
    this.draw.removeLastPoint()
  }
}

module.exports = CustomFacility