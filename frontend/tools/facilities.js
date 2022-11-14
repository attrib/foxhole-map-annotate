const AIconTool = require("./AIconTool");

class Facilities extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'facility', 'building', {
      title: 'Facilities',
      zIndex: 20,
      iconSelect: true,
      iconDefault: 'port',
    });
  }
}

module.exports = Facilities