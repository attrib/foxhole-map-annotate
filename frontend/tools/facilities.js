const AIconTool = require("./AIconTool");

class Facilities extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'facility', 'building', {
      title: 'Facilities',
      zIndex: 25,
      iconSelect: true,
      iconDefault: 'port',
      layerGroup: tools.facilitiesGroup,
    });
  }
}

module.exports = Facilities