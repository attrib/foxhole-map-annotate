const MergeInteraction = require("../Interaction/Merge")

class Merge {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.merge = new MergeInteraction({
      features: tools.line.allLinesCollection
    })

    this.merge.on('mergedLine', (event) => {
      for (let feature of event.oldFeatures) {
        tools.emit(tools.EVENT_ICON_DELETED, feature)
      }
      tools.emit(tools.EVENT_ICON_ADDED, event.newFeature)
      tools.changeTool(false)
    })

    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.toolDeSelected)
    tools.on(tools.EVENT_TOOL_SELECTED, (selectedTool) => {
      if (selectedTool === 'merge') {
        this.toolSelected()
      }
      else {
        this.toolDeSelected()
      }
    })
  }

  toolSelected = () => {
    this.map.addInteraction(this.merge)
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.merge)
  }

}

module.exports = Merge