import {Draw} from "ol/interaction";
import {assert} from "ol/asserts";
import {Fill, Stroke, Style, Text} from "ol/style";
import {Vector} from "ol/layer";
import {Collection} from "ol";
import {Vector as VectorSource} from "ol/source";
import {createEditingStyle} from "ol/style/Style";


class Polygon {

  editingStyles = createEditingStyle();
  active = false
  firstAbortClick = false

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
      title: 'Custom Areas',
      style: this.style,
      zIndex: 5,
      searchable: true,
    });
    this.map.addLayer(vector);

    this.draw = new Draw({
      type: 'Polygon',
      stopClick: true,
      style: this.style,
      condition: (event) => {
        const pointerEvent = event.originalEvent;
        assert(pointerEvent !== undefined, 56); // mapBrowserEvent must originate from a pointer event
        if (pointerEvent.button === 2) {
          const needSecondAbortClick = this.sketchFeature && this.sketchFeature.getGeometry().getCoordinates()[0].length > 1
          this.draw.removeLastPoint()
          if (!this.sketchFeature && !needSecondAbortClick) {
            this.tools.changeTool(false)
          }
          return false
        }
        // Left click add new point
        else if (pointerEvent.button === 0) {
          return true
        }
        return false;
      },
    });
    this.draw.on('drawstart', (event) => {
      event.feature.set('type', 'polygon', true)
      event.feature.set('color', tools.sidebar.colorInput.value + 'AA')
      this.sketchFeature = event.feature
    })
    this.draw.on('drawend', (event) => {
      const feature = event.feature
      feature.set('type', 'polygon', true)
      feature.set('color', tools.sidebar.colorInput.value + 'AA', true)
      feature.set('notes', tools.sidebar.notesInput.value)
      tools.emit(tools.EVENT_ICON_ADDED, feature)
      tools.changeTool(false)
      this.sketchFeature = null
    })
    this.draw.on('drawabort', () => {
      this.sketchFeature = null
    })

    this.polygonStyle = new Style({
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

    tools.on(tools.EVENT_FEATURE_SELECTED('polygon'), this.featureSelected)
    tools.on(tools.EVENT_FEATURE_DESELECTED('polygon'), this.featureDeSelected)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.toolDeSelected)
    this.tools.on(this.tools.EVENT_TOOL_SELECTED, (selectedTool) => {
      if (selectedTool === 'polygon') {
        this.toolSelected()
      } else {
        this.toolDeSelected()
      }
    })
    tools.on(tools.EVENT_DECAY_UPDATED, (data) => {
      if (data.type === 'polygon') {
        const feature = this.source.getFeatureById(data.id)
        if (feature) {
          feature.set('time', data.time)
        }
      }
    })
    tools.on(tools.EVENT_FLAGGED, (data) => {
      if (data.type === 'polygon') {
        const feature = this.source.getFeatureById(data.id)
        if (feature) {
          feature.set('flags', data.flags)
        }
      }
    })
    tools.on(tools.EVENT_FEATURE_UPDATED, ({operation, feature}) => {
      if (feature.get('type') === 'polygon') {
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
    this.tools.sidebar.displayForm(['color', 'notes'])
    this.active = true
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.draw)
    this.active = false
  }

  style = (feature) => {
    if (feature.getGeometry().getType() === 'Polygon') {
      const notes = feature.get('notes') === undefined || this.tools.sidebar.editFeature === feature ? this.tools.sidebar.notesInput.value : feature.get('notes')
      const color = feature.get('color') === undefined || this.tools.sidebar.editFeature === feature ? this.tools.sidebar.colorInput.value + 'AA' : feature.get('color')
      this.polygonStyle.getText().setText(notes.split("\n")[0])
      this.polygonStyle.getFill().setColor(color)
      return this.polygonStyle
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
    this.tools.sidebar.setColorInputActive()
    this.tools.sidebar.displayForm(['color', 'notes'])
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

export default Polygon