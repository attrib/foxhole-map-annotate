import {ACL_ICONS_ONLY} from "../../lib/ACLS";

class Sidebar {

  editFeature = null

  /**
   * @param {EditTools}  tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.tools = tools

    const offcanvas = document.getElementById('sidebar')
    this.bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvas ,{ keyboard: true, backdrop: false, scroll: true})
    offcanvas.addEventListener('hide.bs.offcanvas', () => {
      tools.edit.controlElement.classList.remove('selected')
      tools.changeMode(false)
    })

    const ppeFilter = document.getElementById('ppe-filter')
    this.ppeFilterContent = document.getElementById('ppe-filter-content')
    this.ppeButtons = ppeFilter.getElementsByClassName('button')
    for (const button of this.ppeButtons) {
      button.addEventListener('change', (event) => {
        this.filterSelected(button.value)
      })
    }
    this.filterSelected('public-radio')

    for (const imageButton of this.ppeFilterContent.getElementsByClassName('btn')) {
      imageButton.addEventListener('click', () => {
        tools.icon.clickIcon(imageButton)
      })
    }
    tools.on(tools.EVENT_EDIT_MODE_ENABLED, this.editModeEnabled)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.editModeDisabled)

    this.clanInput = document.getElementById('clan-input')
    this.lineTypeInput = document.getElementById('line-type-input')
    this.colorInput = document.getElementById('color-input')
    this.notesInput = document.getElementById('notes-input')
    this.buttonRow = document.getElementById('button-row')
    this.displayForm(['notes'])

    const colorPicker = document.getElementById('color-picker')
    const defaultColor = localStorage.getItem('defaultColor');
    if (defaultColor) {
      this.colorInput.value = defaultColor;
    }
    this.colorInput.addEventListener('input', () => {
      if (this.editFeature && this.editFeature.get('color') !== undefined) {
        this.editFeature.set('color', this.colorInput.value + this.featureColorSuffix(this.editFeature))
      }
      localStorage.setItem('defaultColor', this.colorInput.value)
      this.setColorInputActive()
    })

    this.notesInput.addEventListener('keyup', () => {
      if (this.editFeature && this.editFeature.get('notes') !== undefined) {
        this.editFeature.set('notes', this.notesInput.value)
      }
    })

    this.clanInput.addEventListener('keyup', () => {
      if (this.editFeature && this.editFeature.get('clan') !== undefined) {
        this.editFeature.set('clan', this.clanInput.value)
      }
    })

    this.lineTypeInput.addEventListener('change', () => {
      if (this.editFeature && this.editFeature.get('lineType') !== undefined) {
        this.editFeature.set('lineType', this.lineTypeInput.value)
      }
    })

    for (const predefinedColor of colorPicker.getElementsByTagName('i')) {
      predefinedColor.addEventListener('click', () => {
        this.colorInput.value = this.rgb2hex(predefinedColor.style.color)
        this.colorInput.dispatchEvent(new Event('input'))
      })
    }

    document.getElementById('save-button').addEventListener('click', () => {
      if (this.editFeature) {
        const type = this.editFeature.get('type')
        if (type === 'line') {
          this.editFeature.set('clan', this.clanInput.value, true)
        }
        if (type === 'line') {
          this.editFeature.set('lineType', this.lineTypeInput.value, true)
        }
        if (['line', 'polygon'].includes(type)) {
          this.editFeature.set('color', this.colorInput.value + this.featureColorSuffix(this.editFeature), true)
        }
        this.editFeature.set('notes', this.notesInput.value)
        tools.emit(tools.EVENT_ICON_UPDATED, this.editFeature)
      }
    })
    document.addEventListener('keydown', (event) => {
      if (this.editFeature && event.key === 'Delete') {
        tools.emit(tools.EVENT_ICON_DELETED, this.editFeature)
        this.clearInput();
      }
    })
    document.getElementById('delete-button').addEventListener('click', () => {
      if (this.editFeature) {
        tools.emit(tools.EVENT_ICON_DELETED, this.editFeature)
        this.clearInput();
      }
    })

    this.toolButtons = document.getElementById('tool-buttons').children
    for (const button of this.toolButtons) {
      button.addEventListener('click', () => {
        this.tools.changeTool(button.dataset.tool)
      })
    }
    this.tools.on(this.tools.EVENT_TOOL_SELECTED, this.selectTool)
  }

  rgb2hex = (rgb) => {
    function hex(x) {
      return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s*\d+\.*\d+)?\)$/);
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
  }

  setColorInputActive = () => {
    const colorPicker = document.getElementById('color-picker')
    let allFalse = true
    for (const predefinedColor of colorPicker.getElementsByTagName('i')) {
      if (this.rgb2hex(predefinedColor.style.color) === this.colorInput.value) {
        predefinedColor.classList.add('active')
        allFalse = false
      }
      else {
        predefinedColor.classList.remove('active')
      }
    }
    if (allFalse) {
      this.colorInput.classList.add('active')
    }
    else {
      this.colorInput.classList.remove('active')
    }
  }

  featureColorSuffix = (feature) => {
    return (feature.get('type') === 'polygon' ? 'AA' : '')
  }

  selectTool = (selectedTool) => {
    if (!selectedTool) {
      this.tools.sidebar.displayForm(['notes'])
    }
    for (const button of this.toolButtons) {
      const tool = button.dataset.tool
      if (selectedTool === tool) {
        button.classList.add('active')
      }
      else {
        button.classList.remove('active')
      }
    }
  }

  filterSelected = (show) => {
    for (const filter of ['public-radio', 'private-radio', 'enemy-radio']) {
      for (const content of this.ppeFilterContent.getElementsByClassName(filter)) {
        content.style.display = content.classList.contains(show) ? '' : 'none';
      }
    }
  }

  editModeEnabled = () => {
    this.bsOffcanvas.show()
  }

  editModeDisabled = () => {
    this.bsOffcanvas.hide()
  }

  clearInput = () => {
    this.notesInput.value = ''
    this.clanInput.value = ''
    if (this.editFeature) {
      this.tools.emit(this.tools.EVENT_UPDATE_CANCELED, this.editFeature)
      this.buttonRow.style.display = 'none'
    }
  }

  displayForm = (visibleFields) => {
    this.clanInput.parentElement.parentElement.style.display = visibleFields.includes('clan') ? '' : 'none'
    this.lineTypeInput.parentElement.parentElement.style.display = visibleFields.includes('lineType') ? '' : 'none'
    this.colorInput.parentElement.parentElement.style.display = visibleFields.includes('color') ? '' : 'none'
    this.notesInput.parentElement.parentElement.style.display = visibleFields.includes('notes') ? '' : 'none'
    this.buttonRow.style.display = this.editFeature ? '' : 'none'
  }

  setAcl = (acl) => {
    if (acl === ACL_ICONS_ONLY) {
      for (const button of this.toolButtons) {
        button.classList.add('disabled')
        button.ariaDisabled = 'true'
      }
      for (const iconList of this.ppeFilterContent.getElementsByClassName('hide-acl-icons')) {
        iconList.style.display = 'none'
      }
    }
    else {
      for (const button of this.toolButtons) {
        button.classList.remove('disabled')
        button.ariaDisabled = ''
      }
      for (const iconList of this.ppeFilterContent.getElementsByClassName('hide-acl-icons')) {
        iconList.style.display = ''
      }
    }
  }
}

export default Sidebar