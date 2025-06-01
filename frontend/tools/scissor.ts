import Split from "ol-ext/interaction/Split.js";
import { Vector as VectorSource } from "ol/source.js";

class Scissor {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    const fakeSource = new VectorSource({
      features: tools.line.allLinesCollection,
    });
    this.split = new Split({
      sources: fakeSource,
    })

    this.split.on('aftersplit', (event) => {
      tools.emit(tools.EVENT_ICON_DELETED, event.original)
      for (let feature of event.features) {
        feature.set('id', null)
        // All new features by split will be added by event with a new id
        fakeSource.removeFeature(feature)
        tools.emit(tools.EVENT_ICON_ADDED, feature)
      }
      tools.changeTool(false)
    })

    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.toolDeSelected)
    tools.on(tools.EVENT_TOOL_SELECTED, (selectedTool) => {
      if (selectedTool === 'scissor') {
        this.toolSelected()
      } else {
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

export default Scissor