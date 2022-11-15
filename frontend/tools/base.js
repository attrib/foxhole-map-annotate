const AIconTool = require("./AIconTool");

class Base extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'base', 'bank', {
      title: 'Bases',
      zIndex: 30,
      left: '3.5em',
      iconSelect: true,
      iconDefault: 'base',
    });
  }
}

module.exports = Base