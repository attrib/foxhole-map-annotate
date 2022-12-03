const {Draw} = require("ol/interaction");
const {assert} = require("ol/asserts");
const {Style, Icon: olIcon} = require("ol/style");
const {Vector} = require("ol/layer");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");

class Icon {

  iconStyleCache = {}
  selectedImage = null
  sources = {}

  /**
   * @param {EditTools}  tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.tools = tools

    for (const tool of Object.values(tools.iconTools)) {
      this.sources[tool.type] = new VectorSource({
        features: new Collection([]),
      });
      const vector = new Vector({
        source: this.sources[tool.type],
        title: tool.title,
        style: this.iconStyle,
        zIndex: tool.zIndex,
        searchable: true,
      });
      if (tool.layerGroup) {
        tool.layerGroup.getLayers().push(vector)
      }
      else {
        this.map.addLayer(vector);
      }
    }

    this.iconDraw = new Draw({
      type: 'Point',
      stopClick: true,
      style: this.drawIconStyle,
      condition: (event) => {
        const pointerEvent = event.originalEvent;
        assert(pointerEvent !== undefined, 56); // mapBrowserEvent must originate from a pointer event
        if (pointerEvent.button === 2) {
          this.unselectIcon()
          return false
        }
        // Left click add new point
        else if (pointerEvent.button === 0) {
          return true
        }
        return false;
      },
    });
    this.iconDraw.on('drawstart', (event) => {
      event.feature.set('type', this.featureType)
    })
    this.iconDraw.on('drawend', (event) => {
      const feature = event.feature
      feature.set('icon', this.featureIcon);
      feature.set('type', this.featureType)
      feature.set('notes', tools.sidebar.notesInput.value)
      this.unselectIcon()
      tools.emit(tools.EVENT_ICON_ADDED, feature)
    })


    tools.on(tools.EVENT_FEATURE_SELECTED('icon'), this.featureSelected)
    tools.on(tools.EVENT_FEATURE_DESELECTED('icon'), this.featureDeSelected)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.unselectIcon)
    tools.on(tools.EVENT_TOOL_SELECTED, this.unselectIcon)

    tools.on(tools.EVENT_DECAY_UPDATED, (data) => {
      if (data.type in this.sources) {
        const feature = this.sources[data.type].getFeatureById(data.id)
        if (feature) {
          feature.set('time', data.time)
        }
      }
    })
    tools.on(tools.EVENT_FEATURE_UPDATED, ({operation, feature}) => {
      if (feature.get('type') in this.sources) {
        const type = feature.get('type')
        if (operation === 'add') {
          this.sources[type].addFeature(feature)
          return
        }
        const editFeature = this.sources[type].getFeatureById(feature.getId())
        if (operation === 'update') {
          this.sources[type].removeFeature(editFeature)
          this.sources[type].addFeature(feature)
        }
        else if (operation === 'delete') {
          this.sources[type].removeFeature(editFeature)
        }
      }
    })
  }

  clickIcon = (image) => {
    if (this.tools.sidebar.editFeature) {
      const editType = this.tools.sidebar.editFeature.get('type')
      if (['line', 'polygon'].includes(editType)) {
        this.tools.select.deselectAll()
      }
    }
    image.classList.add('active')
    this.tools.sidebar.displayForm(['notes'])
    if (this.selectedImage) {
      this.selectedImage.classList.remove('active')
    }
    if (this.selectedImage !== image) {
      if (!this.iconDraw.getMap() && this.tools.sidebar.editFeature === null) {
        this.map.addInteraction(this.iconDraw)
      }
      this.selectedImage = image
      const match = this.selectedImage.firstElementChild.src.match(/images\/(.*?)\/(.*?)\.(svg|png)/)
      this.featureType = match[1]
      this.featureIcon = match[2]
      if (this.tools.sidebar.editFeature) {
        this.tools.sidebar.editFeature.set('type', this.featureType)
        this.tools.sidebar.editFeature.set('icon', this.featureIcon)
      }
    }
    else {
      this.unselectIcon()
    }
  }

  unselectIcon = () => {
    if (this.selectedImage) {
      this.selectedImage.classList.remove('active')
      this.selectedImage = null
    }
    this.map.removeInteraction(this.iconDraw)
  }

  drawIconStyle = () => {
    const src = this.selectedImage.firstElementChild.src
    if (!(src in this.iconStyleCache)) {
      this.iconStyleCache[src] = new Style({
        image: new olIcon({
          src: src,
        }),
      })
    }
    return this.iconStyleCache[src]
  }

  iconStyle = (feature) => {
    const src = this.getImageUrl(feature)
    if (!(src in this.iconStyleCache)) {
      this.iconStyleCache[src] = new Style({
        image: new olIcon({
          src: src,
        }),
      })
    }
    return this.iconStyleCache[src]
  }

  getImageUrl = (feature) => {
    return `/images/${feature.get('type')}/${feature.get('icon')}.svg`
  }

  featureSelected = (feature) => {
    if (!this.tools.hasAccess('icon.edit', feature)) {
      this.tools.sidebar.displayForm(['notes'])
      this.unselectIcon()
      return;
    }
    this.tools.sidebar.editFeature = feature
    this.tools.sidebar.notesInput.value = feature.get('notes') || ''
    this.tools.sidebar.displayForm(['notes']);
    this.featureType = feature.get('type')
    this.featureIcon = feature.get('icon')
    if (this.selectedImage) {
      this.selectedImage.classList.remove('active')
    }
    this.selectedImage = this.tools.sidebar.ppeFilterContent.querySelector('img[src="' + this.getImageUrl(feature) + '"]').parentElement
    for (const className of this.selectedImage.classList) {
      if (className.match('-radio')) {
        this.tools.sidebar.filterSelected(className)
        for (const button of this.tools.sidebar.ppeButtons) {
          button.checked = className === button.id
        }
        break;
      }
    }
    this.selectedImage.classList.add('active')
  }

  featureDeSelected = () => {
    this.tools.sidebar.editFeature = null
    this.tools.sidebar.displayForm(['notes']);
    this.tools.sidebar.clearInput();
    this.unselectIcon()
  }

}

module.exports = Icon