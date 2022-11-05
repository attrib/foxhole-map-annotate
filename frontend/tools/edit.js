const {createCustomControlElement} = require("../mapControls");
const {Control} = require("ol/control");
const {Modify, Select} = require("ol/interaction");
const {altKeyOnly, shiftKeyOnly, singleClick} = require("ol/events/condition");

class Edit {

  selectedFeature = null

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
    document.addEventListener('keypress', (event) => {
      if (event.key === 'e') {
        if (!tools.editMode) {
          this.controlElement.classList.add('selected')
          tools.changeMode(true)
        }
      }
    })
    this.map.getInteractions().forEach((interaction) => {
      if (interaction instanceof Select) {
        this.select = interaction
      }
    })
    tools.on(tools.EVENT_EDIT_MODE_ENABLED, this.editModeEnabled)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.editModeDisabled)
    this.select.on('select', (event) => {
      if (!tools.editMode) {
        if (event.deselected.length > 0) {
          this.selectedFeature = null
        }
        if (event.selected.length > 0) {
          this.selectedFeature = event.selected[0]
        }
        return
      }
      if (event.deselected.length > 0) {
        const type = event.deselected[0].get('type')
        tools.emit(type + '-deselected', event.deselected[0]);
      }
      if (event.selected.length > 0) {
        const type = event.selected[0].get('type')
        tools.emit(type + '-selected', event.selected[0]);
      }
    })
    tools.on(tools.EVENT_EDIT_MODE_ENABLED, () => {
      if (this.selectedFeature !== null) {
        const type = this.selectedFeature.get('type')
        tools.emit(type + '-selected', this.selectedFeature);
        this.selectedFeature = null;
      }
    })
    tools.on(tools.EVENT_TRACK_UPDATED, this.deselectAll)
    tools.on(tools.EVENT_TRACK_UPDATE_CANCELED, this.deselectAll)
  }

  editModeEnabled = () => {
    this.modify = new Modify({
      features: this.select.getFeatures(),
      deleteCondition: (event) => {
        if (altKeyOnly(event) && singleClick(event)) {
          event.stopPropagation()
          return true
        }
        if (shiftKeyOnly(event) && singleClick(event)) {
          event.stopPropagation()
          const feature = this.select.getFeatures().pop()
          const type = feature.get('type')
          this.tools.emit(type + '-deselected', feature);
          if (type === 'track') {
            this.tools.emit(this.tools.EVENT_TRACK_DELETE, feature)
          }
          else if (['sign'].includes(type)) {
            this.tools.emit(this.tools.EVENT_ICON_DELETED, feature)
          }
          this.select.changed()
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

  deselectAll = () => {
    const feature = this.select.getFeatures().pop()
    if (feature) {
      const type = feature.get('type')
      this.tools.emit(type + '-deselected', feature);
    }
  }
}



module.exports = Edit