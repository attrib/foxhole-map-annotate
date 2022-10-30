const ADrawTool = require("./ADrawTool");

class Warning extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'warning', 'exclamation-triangle', {
      title: 'Warnings'
    });
  }

}

module.exports = Warning