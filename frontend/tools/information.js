const AIconTool = require("./AIconTool");

class Information extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'information', 'exclamation-triangle', {
      title: 'Informations',
      zIndex: 50,
      allowEditWithIconsACL: true,
      iconSelect: true,
      iconDefault: 'warning',
    });
  }
}

module.exports = Information