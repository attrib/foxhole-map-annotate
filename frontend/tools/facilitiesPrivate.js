const AIconTool = require("./AIconTool");

class FacilitiesPrivate extends AIconTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'facility-private', 'lock', {
      title: 'Private Facilities',
      zIndex: 15,
      left: '2em',
      iconSelect: true,
      iconDefault: 'private_cmats',
      layerGroup: tools.facilitiesGroup,
    });
  }
}

module.exports = FacilitiesPrivate