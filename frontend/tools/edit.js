const {createCustomControlElement} = require("../mapControls");
const {Control} = require("ol/control");
const {Modify} = require("ol/interaction");
const {altKeyOnly, shiftKeyOnly, singleClick} = require("ol/events/condition");

class Edit {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.tools = tools
    this.controlElement = createCustomControlElement('gear', (e, selected) => {
      tools.changeMode(selected)
    }, {
      elementClass: 'edit-button',
      title: 'Toggle EditMode (e)',
    })
    this.control = new Control({
      element: this.controlElement
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'e') {
        if (!tools.editMode) {
          this.controlElement.classList.add('selected')
          tools.changeMode(true)
        }
      }
      if (event.key === 'Escape') {
        if (tools.editMode) {
          this.controlElement.classList.remove('selected')
          tools.changeMode(false)
        }
      }
    })
    tools.on(tools.EVENT_EDIT_MODE_ENABLED, this.editModeEnabled)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.editModeDisabled)
  }

  editModeEnabled = () => {
    this.modify = new Modify({
      features: this.tools.select.getFeatures(),
      deleteCondition: (event) => {
        if (altKeyOnly(event) && singleClick(event)) {
          event.stopPropagation()
          return true
        }
        if (shiftKeyOnly(event) && singleClick(event)) {
          event.stopPropagation()
          const feature = this.tools.select.getFeatures().pop()
          const type = feature.get('type')
          this.tools.emit(type + '-deselected', feature);
          if (type === 'track') {
            this.tools.emit(this.tools.EVENT_TRACK_DELETE, feature)
          }
          else if (['information', 'sign', 'facility', 'custom-facility'].includes(type)) {
            this.tools.emit(this.tools.EVENT_ICON_DELETED, feature)
          }
          this.tools.select.changed()
          return false
        }
        return false
      }
    });
    this.map.addInteraction(this.modify)
  }


  editModeDisabled = () => {
    this.map.removeInteraction(this.modify)
    this.modify = null
  }
}



module.exports = Edit