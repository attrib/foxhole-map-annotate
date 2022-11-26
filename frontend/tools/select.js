const {never} = require("ol/events/condition");
const {Style, Circle, Stroke} = require("ol/style");
const {SelectEvent} = require("ol/interaction/Select");
const {Select: OlSelect} = require("ol/interaction")
const {Overlay} = require("ol");

class Select {

  /**
   * @param {import('../mapEditTools')} tools
   * @param {import('ol').Map} map
   */
  constructor(tools, map) {
    this.tools = tools
    this.map = map

    this.selectOverlays = {}
    this.clocks = {}
    this.select = new OlSelect({
      multi: false,
      toggleCondition: never,
      style: this.selectStyle(),
      filter: (feature) => {
        return !(feature.get('type') && ['Region', 'Major', 'Minor', 'town', 'industry', 'field'].includes(feature.get('type')));
      }
    })

    this.select.on('select', (event) => {
      if (this.tools.editMode) {
        if (event.deselected.length > 0) {
          if (event.deselected[0]) {
            const type = event.deselected[0].get('type')
            this.tools.emit(this.tools.EVENT_FEATURE_DESELECTED(type), event.deselected[0]);
          }
        }
        if (event.selected.length > 0) {
          const type = event.selected[0].get('type')
          if (tools.hasAccess(type + '.edit', event.selected[0])) {
            this.tools.emit(this.tools.EVENT_FEATURE_SELECTED(type), event.selected[0]);
          }
        }
      }
      if (event.deselected.length > 0) {
        for (const feature of event.deselected) {
          this.deleteSelectOverlay(feature)
        }
      }
      if (event.selected.length > 0) {
        const feature = event.selected[0];
        const id = feature.get('id')
        const infoBox = feature.get('type') === 'track' ? this.trackInfo.cloneNode(true) : this.iconInfo.cloneNode(true)
        if (feature.get('type') === 'track') {
          this.showTrackInfoBox(infoBox, feature)
        }
        else {
          this.showIconInfoBox(infoBox, feature)
        }
        this.clocks[id] = infoBox.getElementsByClassName('clock')[0]
        this.clocks[id].addEventListener('click', this.updateDecay)
        infoBox.id = 'selected-' + id
        const overlay = new Overlay({
          element: infoBox,
          offset: [10, 10],
          position:  event.mapBrowserEvent.coordinate
        })
        this.selectOverlays[id] = overlay
        this.map.addOverlay(overlay)
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
    tools.on(tools.EVENT_TRACK_DELETE, this.deleteSelectOverlay)
    tools.on(tools.EVENT_ICON_DELETED, this.deleteSelectOverlay)

    map.addInteraction(this.select)

    this.trackInfo = document.getElementById('track-info')
    this.iconInfo = document.getElementById('icon-info');

    this.trackInfoOverlay = new Overlay({
      element: this.trackInfo,
      offset: [10, 10]
    })
    this.map.addOverlay(this.trackInfoOverlay)
    this.iconInfoOverlay = new Overlay({
      element: this.iconInfo,
      positioning: 'top-right',
      offset: [-10, 10]
    })
    this.map.addOverlay(this.iconInfoOverlay)

    map.on('pointermove', (evt) => {
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
        this.infoBoxFeature(feature, evt.coordinate)
      }
    })

    tools.on(tools.EVENT_DECAY_UPDATED, (data) => {
      if (data.id in this.clocks) {
        this.setClockColor(this.clocks[data.id], new Date(data.time))
      }
    })
  }

  selectStyle = () => {
    const trackStyle = this.tools.track.style();
    const white = [255, 255, 255, 1];
    const blue = [0, 153, 255, 1];
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
    return (feature, zoom) => {
      const type = feature.get('type')
      switch (type) {
        case 'track':
          trackStyleHighlight[0].getStroke().setLineDash(this.tools.track.getDashedOption(feature))
          trackStyleHighlight[1].getStroke().setLineDash(this.tools.track.getDashedOption(feature))
          return [...trackStyleHighlight, trackStyle(feature, zoom)]

        case 'information':
          return [...circleStyle, this.tools.information._style(feature, zoom)]

        case 'sign':
          return [...circleStyle, this.tools.sign._style(feature, zoom)]

        case 'base':
          return [...circleStyle, this.tools.base._style(feature, zoom)]

        // case 'field':
        //   return [...circleStyle, this.tools.field._style(feature, zoom)]

        case 'facility':
          return [...circleStyle, this.tools.facility._style(feature, zoom)]

        case 'facility-private':
          return [...circleStyle, this.tools.facilityPrivate._style(feature, zoom)]

        case 'facility-enemy':
          return [...circleStyle, this.tools.facilityEnemy._style(feature, zoom)]

        case 'facility-custom':
          return [this.tools.facilityCustom.style(feature, zoom), ...lineStyle]

      }
    }
  }

  infoBoxFeature = (feature, coords) => {
    if (feature.get('type') === 'track') {
      this.trackInfoOverlay.setPosition(coords)
      this.showTrackInfoBox(this.trackInfo, feature)
    }
    else if (this.tools.iconTools.includes(feature.get('type'))) {
      if (this.trackInfoOverlay.getPosition() === undefined) {
        this.iconInfoOverlay.setPositioning('top-left')
        this.iconInfoOverlay.setOffset([10, 10])
      }
      else {
        this.iconInfoOverlay.setPositioning('top-right')
        this.iconInfoOverlay.setOffset([-10, 10])
      }
      this.iconInfoOverlay.setPosition(coords)
      this.showIconInfoBox(this.iconInfo, feature)
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
    this.trackInfoOverlay.setPosition(undefined)
    this.iconInfoOverlay.setPosition(undefined)
  }

  showTrackInfoBox = (node, feature) => {
    node.getElementsByClassName('clan')[0].innerHTML = feature.get('clan');
    node.getElementsByClassName('user')[0].innerHTML = feature.get('user');
    this.clockColor(node.getElementsByClassName('clock')[0], feature)
    node.getElementsByClassName('notes')[0].innerHTML = this.getNotes(feature);
  }

  showIconInfoBox = (node, feature) => {
    node.getElementsByClassName('user')[0].innerHTML = feature.get('user');
    this.clockColor(node.getElementsByClassName('clock')[0], feature)
    node.getElementsByClassName('notes')[0].innerHTML = this.getNotes(feature)
  }

  clockColor = (clock, feature) => {
    if (feature.get('type') === 'field' || feature.get('type') === 'sign') {
      clock.style.display = 'none'
      return
    }
    clock.style.display = 'block'
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

  deleteSelectOverlay = (feature) => {
    if (feature === undefined) {
      return
    }
    if (feature.get('id') in this.selectOverlays) {
      this.map.removeOverlay(this.selectOverlays[feature.get('id')])
    }
  }

}

module.exports = Select