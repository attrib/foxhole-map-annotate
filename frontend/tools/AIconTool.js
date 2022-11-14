const ADrawTool = require("./ADrawTool");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Draw} = require("ol/interaction");
const {ACL_FULL} = require("../../lib/ACLS");
const {Control} = require("ol/control");
const {Style, Icon} = require("ol/style");
const TomSelect = require("tom-select");

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
      maxResolution: options.maxResolution || undefined
    });
    this.map.addLayer(vector);

    this.form = document.getElementById(this.toolName + '-form');
    this.notesInput = document.getElementById(this.toolName + '-form-notes');
    this.formButtons = document.getElementById(this.toolName + '-form-buttons')
    this.formButtons.style.display = 'none'
    this.submitButton = document.getElementById(this.toolName + '-form-submit')
    this.deleteButton = document.getElementById(this.toolName + '-form-delete')
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

    this.formControl = new Control({
      element: this.form
    })

    this.iconSelectEnabled = options.iconSelect || false
    this.iconDefault = options.iconDefault || ''

    if (this.iconSelectEnabled) {
      this.iconSelect = new TomSelect(`#${this.toolName}-form-icon`, {
        render: {
          option: (data, escape) => {
            return `<div><img src="${this.getImageUrl(data.value)}" alt="${data.text}"> ${data.text}</div>`;
          },
          item: (data, escape) => {
            return `<div><img src="${this.getImageUrl(data.value)}" alt="${data.text}"> ${data.text}</div>`;
          }
        }
      })
      this.iconSelect.on('change', () => {
        if (this.draw) {
          this.draw.changed()
        }
      })
    }
    tools.iconTools.push(this.toolName)
  }

  _style = (feature, zoom) => {
    if (this.style) {
      return this.style(feature, zoom)
    }
    if (this.iconSelectEnabled) {
      const icon = feature.get('icon') || this.iconSelect.getValue();
      return new Style({
        image: new Icon({
          src: this.getImageUrl(icon),
        }),
      })
    }
  }

  toolRightClick = () => {
    this.tools.changeTool(false);
  }

  setFeatureProperties = (feature) => {
    if (this.iconSelectEnabled) {
      feature.set('icon', this.iconSelect.getValue());
    }
  }

  toolSelected = () => {
    if (this.editFeature) {
      this.buttons.style.display = 'none'
      this.tools.emit(this.tools.EVENT_UPDATE_CANCELED, this.editFeature)
      this.editFeature = null;
    }
    this.draw = new Draw({
      type: this.drawType,
      style: this._style,
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
    this.map.addControl(this.formControl)
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.draw)
    this._clearInput()
    this.map.removeControl(this.formControl)
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
    if (this.iconSelectEnabled) {
      this.iconSelect.setValue(this.iconDefault);
    }
    if (this.clearInput) {
      this.clearInput();
    }
  }

  _featureSelected = (feature) => {
    if (!this.allowEditWithIconsACL && this.tools.acl !== ACL_FULL) {
      this.formButtons.style.display = 'none'
      this.map.removeControl(this.formControl)
      return;
    }
    this.editFeature = feature
    this.notesInput.value = feature.get('notes')
    this.map.addControl(this.formControl)
    this.formButtons.style.display = 'block'
    if (this.iconSelectEnabled) {
      this.iconSelect.setValue(feature.get('icon'))
    }
    if (this.featureSelected) {
      this.featureSelected(feature)
    }
  }

  _featureDeSelected = (feature) => {
    this.editFeature = null
    this.formButtons.style.display = 'none'
    this.map.removeControl(this.formControl)
  }

  deleteFeature = () => {
    if (this.editFeature) {
      this.collection.remove(this.editFeature)
      this.tools.emit(this.tools.EVENT_ICON_DELETED, this.editFeature)
      this.formButtons.style.display = 'none'
      this.map.removeControl(this.formControl)
    }
  }

  getImageUrl = (name) => {
    return `/images/${this.toolName}/${name}.svg`;
  }

}

module.exports = AIconTool