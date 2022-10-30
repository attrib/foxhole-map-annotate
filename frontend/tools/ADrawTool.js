const {createCustomControlElement} = require("../mapControls");
const {Control} = require("ol/control");

class ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   * @param {string} toolName
   * @param {string} iconName
   * @param {object} options
   */
  constructor(tools, map, toolName, iconName, options) {
    this.map = map
    this.tools = tools
    this.toolName = toolName;
    this.iconName = iconName;
    this.controlElement = createCustomControlElement(this.iconName, (e, selected) => {
      tools.changeTool(selected ? this.toolName : false)
    }, {
      elementClass: 'edit-buttons',
      ...options
    })
    this.control = new Control({
      element: this.controlElement
    })
    tools.on(tools.EVENT_EDIT_MODE_ENABLED, this.editModeEnabled)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.editModeDisabled)
    tools.on(tools.EVENT_TOOL_SELECTED, this.onToolSelect)
  }

  editModeEnabled = () => {
    this.controlElement.style.display = 'block'
  }

  editModeDisabled = () => {
    this.controlElement.style.display = 'none'
  }

  onToolSelect = (toolName) => {
    if (this.toolName === toolName) {
      this.toolSelected()
    }
    else {
      this.toolDeSelected()
      this.controlElement.classList.remove('selected')
    }
  }


  toolSelected = () => {
  }

  toolDeSelected = () => {
  }

}

module.exports = ADrawTool