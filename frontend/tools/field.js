const AIconTool = require("./AIconTool");

class Field extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    let regionGroup = null
    map.getLayers().forEach((layer) => {
      if (layer.get('title') === 'Region') {
        regionGroup = layer
      }
    })
    super(tools, map, 'field', 'hammer', {
      title: 'Fields',
      zIndex: 20,
      iconSelect: true,
      iconDefault: 'scrap_field',
      maxResolution: 4,
      layerGroup: regionGroup,
    });
  }
}

module.exports = Field