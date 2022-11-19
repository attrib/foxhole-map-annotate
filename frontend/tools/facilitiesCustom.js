const AIconTool = require("./AIconTool");
const {Style, Stroke, Fill, Text} = require("ol/style");
const {createEditingStyle} = require("ol/style/Style");

class FacilitiesCustom extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'facility-custom', 'hexagon', {
      title: 'Custom Facilities',
      left: '3.5em',
      zIndex: 5,
      drawType: 'Polygon',
      layerGroup: tools.facilitiesGroup,
    });
    this.polygonStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(85,85,85,0.52)',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(85,85,85,0.52)',
      }),
      text: new Text({
        font: '1rem system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        text: '',
        fill: new Fill({
          color: '#FFFFFF',
        })
      })
    })
  }

  editingStyles = createEditingStyle();

  /**
   *
   * @param {import("ol").Feature} feature
   * @returns {Style}
   */
  style = (feature) => {
    if (feature.getGeometry().getType() === 'Polygon') {
      const notes = feature.get('notes') === undefined ? this.notesInput.value : feature.get('notes')
      this.polygonStyle.getText().setText(notes)
      return this.polygonStyle
    }
    else {
      return this.editingStyles[feature.getGeometry().getType()]
    }
  }

  toolRightClick = () => {
    this.draw.removeLastPoint()
  }
}

module.exports = FacilitiesCustom