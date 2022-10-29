const {createCustomControlElement} = require("../mapControls");
const {Control} = require("ol/control");
const ADrawTool = require("./ADrawTool");

class Danger extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'danger', 'exclamation-octagon');
  }

}

module.exports = Danger