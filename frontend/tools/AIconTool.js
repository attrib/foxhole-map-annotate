const ADrawTool = require("./ADrawTool");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Draw} = require("ol/interaction");
const {ACL_FULL} = require("../../lib/ACLS");

class AIconTool extends ADrawTool {

  /**
   * @param {import("../mapEditTools")} tools
   * @param {import("ol").Map} map
   * @param toolName
   * @param iconName
   * @param options
   */
  constructor(tools, map, toolName, iconName, options) {
    super(tools, map, toolName, iconName, options);

    this.collection = new Collection([]);
    const source = new VectorSource({
      features: this.collection,
    });

    this.drawType = options.drawType || 'Point';
    this.allowEditWithIconsACL = options.allowEditWithIconsACL || false;

    const vector = new Vector({
      source: source,
      title: options.title || this.toolName,
      style: this._style,
      zIndex: options.zIndex,
    });
    this.map.addLayer(vector);

    this.form = document.getElementById(this.toolName + '-form');
    this.notesInput = document.getElementById(this.toolName + '-form-notes');
    this.submitButton = document.getElementById(this.toolName + '-form-submit');
    this.deleteButton = document.getElementById(this.toolName + '-form-delete')
    this.cancelButton = document.getElementById(this.toolName + '-form-cancel');

    this.cancelButton.addEventListener('click', this._clearInput)
    this.deleteButton.style.display = 'none'
    this.deleteButton.addEventListener('click', this.deleteFeature)

    this.tools.on(this.tools.EVENT_FEATURE_SELECTED(this.toolName), this._featureSelected)
    this.tools.on(this.tools.EVENT_FEATURE_DESELECTED(this.toolName), this._featureDeSelected)

    this.submitButton.addEventListener('click', () => {
      if (this.editFeature) {
        this.editFeature.set('notes', this.notesInput.value);
        this.setFeatureProperties(this.editFeature)
        tools.emit(tools.EVENT_ICON_UPDATED, this.editFeature)
      }
      else {
        this.draw.finishDrawing()
      }
    })

    this.tools.on(this.tools.EVENT_DECAY_UPDATED, (data) => {
      if (data.type === this.toolName) {
        this.collection.forEach((feat) => {
          if (feat.get('id') === data.id) {
            feat.set('time', data.time)
          }
        })
      }
    })
  }

  _style = (feature, zoom) => {
    return this.style(feature, zoom)
  }

  toolRightClick = () => {
  }

  setFeatureProperties = (feature) => {
  }

  toolSelected = () => {
    this.draw = new Draw({
      type: this.drawType,
      style: this.style,
      condition: (event) => {
        if (event.type === 'pointerdown') {
          // Right click cancels tool selection
          if (event.originalEvent.button === 2) {
            this.toolRightClick()
            return false
          }
          // Left click add new point
          else if (event.originalEvent.button === 0) {
            return true
          }
        }
        return false
      },
    });
    this.draw.on('drawstart', (event) => {
      event.feature.set('type', this.toolName)
    })
    this.draw.on('drawend', (event) => {
      const feature = event.feature
      this.setFeatureProperties(feature)
      feature.set('type', this.toolName)
      feature.set('notes', this.notesInput.value)
      this.tools.emit(this.tools.EVENT_ICON_ADDED, feature)
    })
    this.map.addInteraction(this.draw);
    this.form.style.display = 'block';
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.draw)
    this._clearInput()
    this.form.style.display = 'none';
  }

  clearFeatures = () => {
    this.collection.clear()
  }

  addFeature = (feature) => {
    this.collection.push(feature)
  }

  _clearInput = () => {
    this.notesInput.value = ''
    if (this.editFeature) {
      this.tools.emit(this.tools.EVENT_UPDATE_CANCELED, this.editFeature)
    }
    if (this.clearInput) {
      this.clearInput();
    }
  }

  _featureSelected = (feature) => {
    if (!this.allowEditWithIconsACL && this.tools.acl !== ACL_FULL) {
      this.form.style.display = 'none'
      this.deleteButton.style.display = 'none'
      return;
    }
    this.editFeature = feature
    this.notesInput.value = feature.get('notes')
    this.form.style.display = 'block'
    this.deleteButton.style.display = 'block'
    if (this.featureSelected) {
      this.featureSelected(feature)
    }
  }

  _featureDeSelected = (feature) => {
    this.editFeature = null
    this.form.style.display = 'none'
    this.deleteButton.style.display = 'none'
  }

  deleteFeature = () => {
    if (this.editFeature) {
      this.collection.remove(this.editFeature)
      this.tools.emit(this.tools.EVENT_ICON_DELETED, this.editFeature)
    }
  }

  getImageUrl = (name) => {
    switch (name) {
      case 'caution':
      case 'danger':
      case 'no_entry':
      case 'warning':
        return 'images/' + name + '_sign.svg'

      default:
        return 'images/' + name + '.svg'
    }
  }

}

module.exports = AIconTool