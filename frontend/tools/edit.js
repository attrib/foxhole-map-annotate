import { Control } from "ol/control.js";
import { altKeyOnly, shiftKeyOnly, singleClick } from "ol/events/condition.js";
import { Modify } from "ol/interaction.js";

import { createCustomControlElement } from "../mapControls.js";

class Edit {

  copyFeature = []

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
      if (event.target.nodeName.toLowerCase() === 'input' || event.target.nodeName.toLowerCase() === 'textarea') {
        return
      }
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
      if (event.key === 'c' && event.ctrlKey) {
        this.copyFeature = tools.select.getFeatures()

      }
      if (event.key === 'v' && event.ctrlKey && this.copyFeature.getLength() > 0  && tools.hasAccess('icon.add', this.copyFeature.item(0))) {
        tools.select.getFeatures().forEach((feature) => {
          const newFeature = feature.clone()
          newFeature.set('id', '')
          newFeature.getGeometry().translate(50, -50)
          tools.emit(tools.EVENT_ICON_ADDED, newFeature)
        })
      }
    })
    tools.on(tools.EVENT_EDIT_MODE_ENABLED, this.editModeEnabled)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.editModeDisabled)

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
          this.tools.emit(type + '-deselected', feature)
          if (Object.keys(this.tools.iconTools).includes(type)) {
            this.tools.emit(this.tools.EVENT_ICON_DELETED, feature)
          }
          this.tools.select.changed()
          return false
        }
        return false
      }
    });
  }

  editModeEnabled = () => {
    this.map.addInteraction(this.modify)
    this.map.addInteraction(this.tools.line.snap)
  }


  editModeDisabled = () => {
    this.map.removeInteraction(this.modify)
    this.map.removeInteraction(this.tools.line.snap)
  }
}


export default Edit