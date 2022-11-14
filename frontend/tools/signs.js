const AIconTool = require("./AIconTool");

class Signs extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'sign', 'sign-turn-left', {
      title: 'Signs',
      zIndex: 30,
      left: '2em',
      iconSelect: true,
      iconDefault: 'dead_end',
    });
  }
}

module.exports = Signs