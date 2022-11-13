const {never, singleClick} = require("ol/events/condition");
const {Style, Circle, Stroke} = require("ol/style");
const {SelectEvent} = require("ol/interaction/Select");
const {Select: OlSelect} = require("ol/interaction")

class Select {

  /**
   * @param {import('../mapEditTools')} tools
   * @param {import('ol').Map} map
   */
  constructor(tools, map) {
    this.tools = tools
    this.map = map

    this.select = new OlSelect({
      multi: false,
      toggleCondition: never,
      condition: (event) => {
        if (['information', 'sign', 'facility', 'custom-facility'].includes(this.tools.selectedTool)) {
          return false;
        }
        return singleClick(event)
      },
      style: this.selectStyle()
    })

    this.select.on('select', (event) => {
      if (this.tools.editMode) {
        if (event.deselected.length > 0) {
          const type = event.deselected[0].get('type')
          this.tools.emit(this.tools.EVENT_FEATURE_DESELECTED(type), event.deselected[0]);
        }
        if (event.selected.length > 0) {
          const type = event.selected[0].get('type')
          this.tools.emit(this.tools.EVENT_FEATURE_SELECTED(type), event.selected[0]);
        }
      }
      if (this.hasSelected()) {
        this.infoBoxFeature(this.getSelectedFeature())
      }
      else {
        this.hideInfoBoxes()
      }
    })

    tools.on(tools.EVENT_EDIT_MODE_ENABLED, () => {
      if (this.hasSelected()) {
        const selectedFeature = this.getSelectedFeature();
        const type = selectedFeature.get('type')
        tools.emit(tools.EVENT_FEATURE_SELECTED(type), selectedFeature);
      }
    })
    tools.on(tools.EVENT_TRACK_UPDATED, this.deselectAll)
    tools.on(tools.EVENT_ICON_UPDATED, this.deselectAll)
    tools.on(tools.EVENT_UPDATE_CANCELED, this.deselectAll)

    map.addInteraction(this.select)

    this.trackInfo = document.getElementById('track-info')
    this.iconInfo = document.getElementById('icon-info');
    this.trackClock = document.getElementById('track-clock')
    this.iconClock = document.getElementById('icon-clock')

    this.trackClock.addEventListener('click', this.updateDecay)
    this.iconClock.addEventListener('click', this.updateDecay)

    map.on('pointermove', (evt) => {
      if (this.hasSelected()) {
        return
      }
      const value = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        return [feature, layer];
      });
      if (!value) {
        this.hideInfoBoxes()
      }
      else {
        const [feature, layer] = value;
        if (layer === null) {
          this.hideInfoBoxes()
          return
        }
        this.infoBoxFeature(feature)
      }
    })

    tools.on(tools.EVENT_DECAY_UPDATED, (data) => {
      if (['information', 'sign', 'facility', 'custom-facility'].includes(data.type)) {
        if (this.iconClock.dataset.id === data.id) {
          this.setClockColor(this.iconClock, new Date(data.time))
        }
      }
      else {
        if (this.trackClock.dataset.id === data.id) {
          this.setClockColor(this.trackClock, new Date(data.time))
        }
      }
    })
  }

  selectStyle = () => {
    const trackStyle = this.tools.track.style();
    const white = [255, 255, 255, 1];
    const blue = [0, 153, 255, 1];
    return (feature, zoom) => {
      const type = feature.get('type')
      const circleStyle = [
        new Style({
          image: new Circle({
            stroke: new Stroke({
              width: 6,
              color: white,
            }),
            radius: 18,
          })
        }),
        new Style({
          image: new Circle({
            stroke: new Stroke({
              width: 2,
              color: blue,
            }),
            radius: 18,
          })
        })
      ]
      const lineStyle = [new Style({
        stroke: new Stroke({
          width: 6,
          color: white,
        })
      }),
        new Style({
          stroke: new Stroke({
            width: 3,
            color: blue,
          })
        })]
      const trackStyleHighlight = [new Style({
        stroke: new Stroke({
          width: 10,
          color: white,
        }),
        geometry: this.tools.track.geometryFunction
      }),
        new Style({
          stroke: new Stroke({
            width: 7,
            color: blue,
          }),
          geometry: this.tools.track.geometryFunction
        })
      ]
      switch (type) {
        case 'track':
          return [...trackStyleHighlight, trackStyle(feature, zoom)]

        case 'information':
          return [...circleStyle, this.tools.information.style(feature, zoom)]

        case 'sign':
          return [...circleStyle, this.tools.sign.style(feature, zoom)]

        case 'facility':
          return [...circleStyle, this.tools.facility.style(feature, zoom)]

        case 'custom-facility':
          return [this.tools.customFacility.style(feature, zoom), ...lineStyle]

      }
    }
  }

  infoBoxFeature = (feature) => {
    if (feature.get('type') === 'track') {
      this.showTrackInfoBox(feature)
    }
    else if (['information', 'sign', 'facility', 'custom-facility'].includes(feature.get('type'))) {
      this.showIconInfoBox(feature)
    }
  }

  deselectAll = () => {
    const feature = this.select.getFeatures().pop()
    if (feature) {
      const type = feature.get('type')
      this.tools.emit(type + '-deselected', feature);
    }
    this.select.dispatchEvent(new SelectEvent('select', [], [feature], null))
  }

  getFeatures = () => {
    return this.select.getFeatures()
  }

  hasSelected = () => {
    return this.select.getFeatures().getLength() > 0
  }

  getSelectedFeature = () => {
    if (this.select.getFeatures().getLength() > 0) {
      return this.select.getFeatures().item(0)
    }
  }

  changed = () => {
    this.select.changed()
  }

  hideInfoBoxes = () => {
    this.iconInfo.style.display = 'none'
    this.trackInfo.style.display = 'none'
  }

  showTrackInfoBox = (feature) => {
    this.trackInfo.style.display = 'block'
    this.trackInfo.getElementsByClassName('clan')[0].innerHTML = feature.get('clan');
    this.trackInfo.getElementsByClassName('user')[0].innerHTML = feature.get('user');
    this.clockColor(this.trackClock, feature)
    this.trackInfo.getElementsByClassName('notes')[0].innerHTML = this.getNotes(feature);
  }

  showIconInfoBox = (feature) => {
    this.iconInfo.style.display = 'block';
    this.iconInfo.getElementsByClassName('user')[0].innerHTML = feature.get('user');
    this.clockColor(this.iconClock, feature)
    this.iconInfo.getElementsByClassName('notes')[0].innerHTML = this.getNotes(feature)
  }

  clockColor = (clock, feature) => {
    const time = new Date(feature.get('time'))
    clock.dataset.id = feature.get('id') || null
    clock.dataset.type = feature.get('type') || null
    this.setClockColor(clock, time)
  }

  setClockColor = (clock, time) => {
    const diff = new Date().getTime() - time.getTime()
    const hue = (Math.max(0, Math.min(1, 1 - diff/86400000))*120).toString(10);
    clock.getElementsByTagName('circle')[0].style.fill = `hsl(${hue},100%,50%)`
    clock.title = time.toLocaleString();
  }

  getNotes = (feature) => {
    const note = feature.get('notes') || ''
    return note.replaceAll("\n", '<br>')
  }

  updateDecay = (event) => {
    if (event.currentTarget && event.currentTarget.dataset.id) {
      this.tools.emit(this.tools.EVENT_DECAY_UPDATE, {
        type: event.currentTarget.dataset.type,
        id: event.currentTarget.dataset.id
      })
    }
  }

}

module.exports = Select