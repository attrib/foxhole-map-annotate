const ADrawTool = require("./ADrawTool");
const {Draw, Snap} = require("ol/interaction");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Style, Stroke} = require("ol/style");
const {LineString} = require("ol/geom");
const {createEditingStyle} = require("ol/style/Style");
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
    this.collection = new Collection([]);
    const sourceLine = new VectorSource({
      features: this.collection,
    });

    const vectorLine = new Vector({
      source: sourceLine,
      style: (feature,zoom) => {
        return new Style({
          stroke: new Stroke({
            color: this.colorInput.value,
            width: 5,
          }),
          geometry: this.geometryFunction
        })
      },
      properties: {
        temp: true
      }
    });
    this.map.addLayer(vectorLine);
    this.form = document.getElementById('track-form');
    this.clanInput = document.getElementById('track-form-clan')
    this.colorInput = document.getElementById('track-form-color')
    this.notesInput = document.getElementById('track-form-notes')
    this.submitButton = document.getElementById('track-form-submit')
    this.deleteButton = document.getElementById('track-form-delete')
    this.cancelButton = document.getElementById('track-form-cancel')

    this.cancelButton.addEventListener('click', this.clearInput)
    this.deleteButton.style.display = 'none'
    this.deleteButton.addEventListener('click', this.deleteTrack)

    this.colorInput.addEventListener('input', () => {
      vectorLine.changed()
    })

    this.submitButton.addEventListener('click', () => {
      if (this.editFeature) {
        this.editFeature.set('clan', this.clanInput.value);
        this.editFeature.set('color', this.colorInput.value);
        this.editFeature.set('notes', this.notesInput.value);
        tools.emit(tools.EVENT_TRACK_UPDATED, this.editFeature)
      }
      else if (this.clanInput.value !== '') {
        const features = this.collection.getArray();
        for (const feature of features) {
          feature.set('clan', this.clanInput.value);
          feature.set('color', this.colorInput.value);
          feature.set('notes', this.notesInput.value);
          feature.set('type', this.toolName);
        }
        tools.emit(tools.EVENT_TRACK_ADDED, {
          clan: this.clanInput.value,
          color: this.colorInput.value,
          notes: this.notesInput.value,
          features: features
        })
        this.notesInput.value = ''
        this.collection.clear()
      }
    })

    tools.on(tools.EVENT_FEATURE_SELECTED(this.toolName), this.trackSelected)
    tools.on(tools.EVENT_FEATURE_DESELECTED(this.toolName), this.trackDeSelected)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.trackDeSelected)
  }

  clearInput = () => {
    this.clanInput.value = ''
    this.colorInput.value = '#555555'
    this.notesInput.value = ''
    this.collection.clear()
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
    styles['LineString'][0].setGeometry(this.geometryFunction)
    styles['LineString'][1].setGeometry(this.geometryFunction)
    return function (feature, resolution) {
      return styles[feature.getGeometry().getType()];
    };
  }

  toolSelected = () => {
    this.draw = new Draw({
      type: 'LineString',
      features: this.collection,
      stopClick: true,
      style: this.style(),
      condition: (event) => {
        if (event.type === 'pointerdown') {
          // Right click remove last point
          if (event.originalEvent.button === 2) {
            this.draw.removeLastPoint()
            return false
          }
          // Left click add new point
          else if (event.originalEvent.button === 0) {
            return true
          }
        }
        return false
      }
    });
    this.draw.on('drawstart', (event) => {
      event.feature.set('type', this.toolName)
    })
    this.map.addInteraction(this.draw);
    this.snap = new Snap({features: this.collection});
    this.map.addInteraction(this.snap);
    this.form.style.display = 'block'
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.draw)
    this.map.removeInteraction(this.snap)
    this.form.style.display = 'none'
  }

  trackSelected = (feature) => {
    this.editFeature = feature
    this.clanInput.value = feature.get('clan')
    this.colorInput.value = feature.get('color')
    this.notesInput.value = feature.get('notes')
    this.form.style.display = 'block'
    this.deleteButton.style.display = 'block'
  }

  trackDeSelected = (feature) => {
    this.editFeature = null
    this.form.style.display = 'none'
    this.deleteButton.style.display = 'none'
  }

  deleteTrack = () => {
    if (this.editFeature) {
      this.tools.emit(this.tools.EVENT_TRACK_DELETE, this.editFeature)
    }
  }

}

module.exports = Track