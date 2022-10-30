const ADrawTool = require("./ADrawTool");

class Danger extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'danger', 'exclamation-octagon', {
      title: 'Danger'
    });
  }

}

module.exports = Danger