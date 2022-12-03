const Split = require("ol-ext/interaction/Split");

class Scissor {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.split = new Split.default({
    })

    this.split.on('aftersplit', (event) => {
      const oldFeature = event.features[0];
      tools.emit(tools.EVENT_ICON_UPDATED, oldFeature)
      const newFeature = event.features[1]
      newFeature.set('id', null)
      tools.emit(tools.EVENT_ICON_ADDED, newFeature)
      tools.changeTool(false)
    })

    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.toolDeSelected)
    tools.on(tools.EVENT_TOOL_SELECTED, (selectedTool) => {
      if (selectedTool === 'scissor') {
        this.toolSelected()
      }
      else {
        this.toolDeSelected()
      }
    })
  }

  toolSelected = () => {
    this.map.addInteraction(this.split)
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.split)
  }

}

module.exports = Scissor