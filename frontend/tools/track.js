const ADrawTool = require("./ADrawTool");
const {Draw, Snap} = require("ol/interaction");
const {Collection} = require("ol");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Style, Stroke} = require("ol/style");

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
          })
        })
      },
      properties: {
        temp: true
      }
    });
    this.map.addLayer(vectorLine);
    this.form = document.getElementById('track-form');
    this.clanInput = this.form.getElementsByClassName('clan')[0]
    this.colorInput = this.form.getElementsByClassName('color')[0]
    this.notesInput = this.form.getElementsByClassName('notes')[0]
    this.submitButton = this.form.getElementsByClassName('submit')[0]
    this.cancelButton = this.form.getElementsByClassName('cancel')[0]

    this.cancelButton.addEventListener('click', this.clearInput)

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

    tools.on('track-selected', this.trackSelected)
    tools.on('track-deselected', this.trackDeSelected)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.trackDeSelected)
  }

  clearInput = () => {
    this.clanInput.value = ''
    this.colorInput.value = '#555555'
    this.notesInput.value = ''
    this.collection.clear()
    if (this.editFeature) {
      this.tools.emit(this.tools.EVENT_TRACK_UPDATE_CANCELED, this.editFeature)
    }
  }

  toolSelected = () => {
    this.draw = new Draw({
      type: 'LineString',
      features: this.collection,
      stopClick: true,
    });
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
  }

  trackDeSelected = (feature) => {
    this.editFeature = null
    this.form.style.display = 'none'
  }

}

module.exports = Track