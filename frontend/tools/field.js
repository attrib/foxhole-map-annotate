const AIconTool = require("./AIconTool");

class Field extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'field', 'hammer', {
      title: 'Fields',
      zIndex: 25,
      iconSelect: true,
      iconDefault: 'scrap_field',
      maxResolution: 5,
    });
  }
}

module.exports = Field