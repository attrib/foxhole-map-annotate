const ADrawTool = require("./ADrawTool");
const {Draw, Snap} = require("ol/interaction");
const {Collection, Overlay} = require("ol");
const {Style, Stroke} = require("ol/style");
const {LineString} = require("ol/geom");
const {createEditingStyle} = require("ol/style/Style");
const {ACL_FULL} = require("../../lib/ACLS");
const {Control} = require("ol/control");
const bezier = require("@turf/bezier-spline").default;

class Track extends ADrawTool {

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'track', 'train-front', {
      title: 'TrackMode'
    });
    this.form = document.getElementById('track-form');
    this.buttons = document.getElementById('track-form-buttons');
    this.clanInput = document.getElementById('track-form-clan')
    this.colorInput = document.getElementById('track-form-color')
    this.notesInput = document.getElementById('track-form-notes')
    this.submitButton = document.getElementById('track-form-submit')
    this.deleteButton = document.getElementById('track-form-delete')

    this.buttons.style.display = 'none'
    this.deleteButton.addEventListener('click', this.deleteTrack)

    this.colorInput.addEventListener('input', () => {
      if (this.editFeature) {
        this.editFeature.set('color', this.colorInput.value)
      }
      else {
        this.draw.changed();
      }
    })

    this.submitButton.addEventListener('click', () => {
      if (this.editFeature) {
        this.editFeature.set('clan', this.clanInput.value);
        this.editFeature.set('color', this.colorInput.value);
        this.editFeature.set('notes', this.notesInput.value);
        tools.emit(tools.EVENT_TRACK_UPDATED, this.editFeature)
      }
      else {
        this.draw.finishDrawing()
      }
    })

    tools.on(tools.EVENT_FEATURE_SELECTED(this.toolName), this.trackSelected)
    tools.on(tools.EVENT_FEATURE_DESELECTED(this.toolName), this.trackDeSelected)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.trackDeSelected)

    const confirmButton = document.createElement('button');
    confirmButton.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
    confirmButton.style.color = 'green';
    confirmButton.title = 'Confirm';
    confirmButton.className = 'overlay-button';
    confirmButton.addEventListener('click', () => {
      this.draw.finishDrawing()
    })
    const confirmElement = document.createElement('div');
    confirmElement.className = 'ol-unselectable ol-control ';
    confirmElement.appendChild(confirmButton);

    this.confirmOverlay = new Overlay({
      element: confirmElement,
      offset: [-10, 10]
    })
    map.addOverlay(this.confirmOverlay)

    const cancelButton = document.createElement('button');
    cancelButton.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
    cancelButton.style.color = 'red';
    cancelButton.title = 'Cancel';
    cancelButton.className = 'overlay-button';
    cancelButton.addEventListener('click', () => {
      this.draw.abortDrawing()
    })
    const cancelElement = document.createElement('div');
    cancelElement.className = 'ol-unselectable ol-control ';
    cancelElement.appendChild(cancelButton);

    this.cancelOverlay = new Overlay({
      element: cancelElement,
      offset: [-30, 10]
    })
    map.addOverlay(this.cancelOverlay)

    this.formControl = new Control({
      element: this.form
    })
  }

  saveTrack = (feature) => {
    feature.set('clan', this.clanInput.value);
    feature.set('color', this.colorInput.value);
    feature.set('notes', this.notesInput.value);
    feature.set('type', this.toolName);
    this.tools.emit(this.tools.EVENT_TRACK_ADDED, {
      clan: this.clanInput.value,
      color: this.colorInput.value,
      notes: this.notesInput.value,
      feature: feature
    })
    this.notesInput.value = ''
  }

  clearInput = () => {
    this.notesInput.value = ''
    if (this.editFeature) {
      this.tools.emit(this.tools.EVENT_UPDATE_CANCELED, this.editFeature)
    }
  }

  /**
   *
   * @param {import("ol").Feature} feature
   * @returns {*}
   */
  geometryFunction = (feature) => {
    const geometry = new LineString(feature.getGeometry().getCoordinates());

    const line = {
      "type": "Feature",
      "properties": {
      },
      "geometry": {
        "type": "LineString",
        "coordinates": feature.getGeometry().getCoordinates()
      }
    };
    const curved = bezier(line);
    geometry.setCoordinates(curved["geometry"]["coordinates"]);
    return geometry;
  };

  style = () => {
    const styles = createEditingStyle();
    const colorInput = this.colorInput
    styles['LineString'] = new Style({
      stroke: new Stroke({
        color: this.colorInput.value,
        width: 5,
      }),
      geometry: this.geometryFunction
    })
    return function (feature, resolution) {
      if (feature.getGeometry().getType() === 'LineString') {
        styles['LineString'].getStroke().setColor(feature.get('color') || colorInput.value)
      }
      return styles[feature.getGeometry().getType()];
    };
  }

  toolSelected = () => {
    if (this.editFeature) {
      this.buttons.style.display = 'none'
      this.tools.emit(this.tools.EVENT_UPDATE_CANCELED, this.editFeature)
      this.editFeature = null;
    }
    this.map.addControl(this.formControl)
    this.draw = new Draw({
      type: 'LineString',
      features: null,
      stopClick: true,
      style: this.style(),
      condition: (event) => {
        if (event.type === 'pointerdown') {
          // Right click remove last point
          if (event.originalEvent.button === 2) {
            this.draw.removeLastPoint()
            if (this.draw.sketchCoords_ && this.draw.sketchCoords_.length > 2) {
              this.confirmOverlay.setPosition(this.draw.sketchCoords_[this.draw.sketchCoords_.length - 2])
              this.cancelOverlay.setPosition(this.draw.sketchCoords_[this.draw.sketchCoords_.length - 2])
            }
            else {
              this.confirmOverlay.setPosition(undefined)
              this.cancelOverlay.setPosition(undefined)
            }
            return false
          }
          // Left click add new point
          else if (event.originalEvent.button === 0) {
            if (this.draw.sketchCoords_ && this.draw.sketchCoords_.length > 1) {
              this.confirmOverlay.setPosition(event.coordinate)
              this.cancelOverlay.setPosition(event.coordinate)
            }
            return true
          }
        }
        return false
      }
    });
    this.draw.on('drawstart', (event) => {
      event.feature.set('type', this.toolName)
    })
    this.draw.on('drawend', (event) => {
      this.confirmOverlay.setPosition(undefined)
      this.cancelOverlay.setPosition(undefined)
      this.saveTrack(event.feature);
    })
    this.draw.on('drawabort', () => {
      this.confirmOverlay.setPosition(undefined)
      this.cancelOverlay.setPosition(undefined)
    })
    this.map.addInteraction(this.draw);
    const snapCollection = new Collection(this.tools.allTracksCollection.getArray())
    this.snap = new Snap({features: snapCollection});
    this.tools.allTracksCollection.on('add', (e) => {
      snapCollection.push(e.element)
    })
    this.map.addInteraction(this.snap);
  }

  toolDeSelected = () => {
    if (this.draw) {
      if (this.draw.getActive()) {
        this.draw.finishDrawing()
      }
      this.map.removeInteraction(this.draw)
      this.map.removeInteraction(this.snap)
      this.map.removeControl(this.formControl)
    }
  }

  trackSelected = (feature) => {
    if (this.tools.acl !== ACL_FULL) {
      this.map.removeControl(this.formControl)
      this.buttons.style.display = 'none'
      return;
    }
    this.editFeature = feature
    this.clanInput.value = feature.get('clan')
    this.colorInput.value = feature.get('color')
    this.notesInput.value = feature.get('notes')
    this.map.addControl(this.formControl)
    this.buttons.style.display = 'block'
  }

  trackDeSelected = (feature) => {
    this.editFeature = null
    this.map.removeControl(this.formControl)
    this.buttons.style.display = 'none'
  }

  deleteTrack = () => {
    if (this.editFeature) {
      this.tools.emit(this.tools.EVENT_TRACK_DELETE, this.editFeature)
      this.map.removeControl(this.formControl)
      this.buttons.style.display = 'none'
    }
  }

}

module.exports = Track