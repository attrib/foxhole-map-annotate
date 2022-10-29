const {createCustomControlElement} = require("../mapControls");
const {Control} = require("ol/control");
const ADrawTool = require("./ADrawTool");

class Warning extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'warning', 'exclamation-triangle');
  }

}

module.exports = Warning