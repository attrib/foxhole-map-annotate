import {Collection} from "ol";
import {createEditingStyle} from "ol/style/Style.js";
import VectorSource from "ol/source/Vector.js";
import {Vector} from "ol/layer.js";
import {Draw} from "ol/interaction.js";
import {Fill, Stroke, Style, Text} from "ol/style.js";
import {createBox} from "ol/interaction/Draw.js";

class Rectangle {

  editingStyles = createEditingStyle();
  active = false
  firstAbortClick = false
  opacity = 'DD'

  /**
   * @param {EditTools}  tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    this.map = map
    this.tools = tools

    this.source = new VectorSource({
      features: new Collection([]),
    });
    const vector = new Vector({
      source: this.source,
      title: 'Custom Rectangles',
      style: this.styles,
      zIndex: 5,
      searchable: true,
    });
    this.map.addLayer(vector);

    this.draw = new Draw({
      type: 'Circle',
      stopClick: true,
      style: this.styles,
      geometryFunction: createBox(),
    });
    this.draw.on('drawstart', (event) => {
      event.feature.set('type', 'rectangle', true)
      event.feature.set('color', tools.sidebar.colorInput.value + this.opacity, true)
      event.feature.set('secondary-color', tools.sidebar.secondaryColorInput.value + this.opacity)
      this.sketchFeature = event.feature
    })
    this.draw.on('drawend', (event) => {
      const feature = event.feature
      feature.set('type', 'rectangle', true)
      feature.set('color', tools.sidebar.colorInput.value + this.opacity, true)
      feature.set('secondary-color', tools.sidebar.secondaryColorInput.value + this.opacity, true)
      feature.set('notes', tools.sidebar.notesInput.value)
      tools.emit(tools.EVENT_ICON_ADDED, feature)
      tools.changeTool(false)
      this.sketchFeature = null
    })
    this.draw.on('drawabort', () => {
      this.sketchFeature = null
    })

    this.rectangleStyle = new Style({
      stroke: new Stroke({
        color: 'rgba(85,85,85,0.52)',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(85,85,85,0.52)',
      }),
      text: new Text({
        font: '1rem system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        text: '',
        fill: new Fill({
          color: '#FFFFFF',
        })
      })
    })

    tools.on(tools.EVENT_FEATURE_SELECTED('rectangle'), this.featureSelected)
    tools.on(tools.EVENT_FEATURE_DESELECTED('rectangle'), this.featureDeSelected)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.toolDeSelected)
    this.tools.on(this.tools.EVENT_TOOL_SELECTED, (selectedTool) => {
      if (selectedTool === 'rectangle') {
        this.toolSelected()
      } else {
        this.toolDeSelected()
      }
    })
    tools.on(tools.EVENT_DECAY_UPDATED, (data) => {
      if (data.type === 'rectangle') {
        const feature = this.source.getFeatureById(data.id)
        if (feature) {
          feature.set('time', data.time)
        }
      }
    })
    tools.on(tools.EVENT_FLAGGED, (data) => {
      if (data.type === 'rectangle') {
        const feature = this.source.getFeatureById(data.id)
        if (feature) {
          feature.set('flags', data.flags)
        }
      }
    })
    tools.on(tools.EVENT_FEATURE_UPDATED, ({operation, feature}) => {
      if (feature.get('type') === 'rectangle') {
        if (operation === 'add') {
          this.source.addFeature(feature)
          return
        }
        const editFeature = this.source.getFeatureById(feature.getId())
        if (operation === 'update') {
          this.source.removeFeature(editFeature)
          this.source.addFeature(feature)
        } else if (operation === 'delete') {
          this.source.removeFeature(editFeature)
        }
      }
    })
  }

  toolSelected = () => {
    this.map.addInteraction(this.draw)
    this.tools.sidebar.displayForm(['color', 'secondaryColor', 'notes'])
    this.active = true
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.draw)
    this.active = false
  }

  styles = (feature) => {
    if (feature.getGeometry().getType() === 'Polygon') {
      const notes = feature.get('notes') === undefined || this.tools.sidebar.editFeature === feature ? this.tools.sidebar.notesInput.value : feature.get('notes')
      const color = feature.get('color') === undefined || this.tools.sidebar.editFeature === feature ? this.tools.sidebar.colorInput.value + this.opacity : feature.get('color')
      const secondaryColor = feature.get('secondary-color') === undefined || this.tools.sidebar.editFeature === feature ? this.tools.sidebar.secondaryColorInput.value + this.opacity : feature.get('secondary-color')
      this.rectangleStyle.getText().setText(notes.split("\n")[0])
      this.rectangleStyle.getFill().setColor(color)
      if (secondaryColor.toUpperCase() === ('#FFFFFF' + this.opacity)) {
        return [this.rectangleStyle]
      }
      const sec = new Style({
        fill: new Fill({
          color: secondaryColor,
        }),
        geometry: function (feature) {
          const geom = feature.getGeometry().clone()
          const extent = geom.getExtent()
          geom.scale(1, 0.25, [extent[2], extent[3]])
          return geom
        },
      });
      return [this.rectangleStyle, sec]
    } else {
      return this.editingStyles[feature.getGeometry().getType()]
    }
  }

  featureSelected = (feature) => {
    if (this.active) {
      return
    }
    if (!this.tools.hasAccess('icon.edit', feature)) {
      this.tools.changeTool(false)
      return;
    }
    this.tools.sidebar.editFeature = feature
    this.tools.sidebar.notesInput.value = this.tools.sidebar.unescape(feature.get('notes') || '')
    this.tools.sidebar.colorInput.value = feature.get('color').slice(0, -2)
    this.tools.sidebar.secondaryColorInput.value = feature.get('secondary-color').slice(0, -2)
    this.tools.sidebar.setColorInputActive()
    this.tools.sidebar.setSecondaryColorInputActive()
    this.tools.sidebar.displayForm(['color', 'secondaryColor', 'notes'])
  }

  featureDeSelected = () => {
    if (this.active) {
      return
    }
    this.tools.sidebar.editFeature = null
    this.tools.sidebar.clearInput();
    this.tools.changeTool(false)
  }

}

export default Rectangle