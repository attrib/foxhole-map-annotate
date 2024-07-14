import {Translate} from "ol/interaction.js";

class Move {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.move = new Translate({
      filter: function(feature, layer) {
        const type = feature.get('type')
        return !!(type && ['base', 'facility', 'facility-enemy', 'facility-private', 'information', 'sign', 'polygon', 'rectangle'].includes(type));
      }
    })

    this.move.on('translateend', (event) => {
      event.features.forEach((feature) => {
        tools.emit(tools.EVENT_ICON_UPDATED, feature)
      })
    })

    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.toolDeSelected)
    tools.on(tools.EVENT_TOOL_SELECTED, (selectedTool) => {
      if (selectedTool === 'move') {
        this.toolSelected()
      } else {
        this.toolDeSelected()
      }
    })
  }

  toolSelected = () => {
    this.map.addInteraction(this.move)
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.move)
  }

}

export default Move