const {Draw, Snap} = require("ol/interaction");
const {Collection, Overlay} = require("ol");
const {Style, Stroke} = require("ol/style");
const {LineString} = require("ol/geom");
const {createEditingStyle} = require("ol/style/Style");
const {Vector: VectorSource} = require("ol/source");
const {Vector, Group} = require("ol/layer");
const bezier = require("@turf/bezier-spline").default;

class Line {

  sources = {}

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {

    this.allLinesCollection = new Collection()
    this.layerGroup = new Group({
      title: 'Train Lines',
      fold: 'close',
    });
    map.addLayer(this.layerGroup);

    this.allLinesCollection.on('add', (e) => {
      const feature = e.element
      const clan = feature.get('clan') || 'Unknown'
      if (!(clan in this.sources)) {
        this.createClanLayer(clan)
      }
      this.sources[clan].addFeature(feature)
    })
    this.allLinesCollection.on('remove', (e) => {
      const feature = e.element
      const clan = feature.get('clan') || 'Unknown'
      if (clan in this.sources) {
        this.sources[clan].removeFeature(feature)
      }
    })

    this.map = map
    this.tools = tools
    this.draw = new Draw({
      type: 'LineString',
      stopClick: true,
      style: this.style(),
      minPoints: 2,
      condition: (event) => {
        if (event.type === 'pointerdown') {
          // Right click remove last point
          if (event.originalEvent.button === 2) {
            const needSecondAbortClick = this.sketchFeature && this.sketchFeature.getGeometry().getCoordinates().length > 1
            this.draw.removeLastPoint()
            if (this.sketchFeature && this.sketchFeature.getGeometry().getCoordinates().length > 2) {
              const coords = this.sketchFeature.getGeometry().getCoordinates();
              this.confirmOverlay.setPosition(coords[coords.length - 1])
              this.cancelOverlay.setPosition(coords[coords.length - 1])
            }
            else {
              this.confirmOverlay.setPosition(undefined)
              this.cancelOverlay.setPosition(undefined)
              if (!(this.sketchFeature || needSecondAbortClick)) {
                this.tools.changeTool(false)
              }
            }
            return false
          }
          // Left click add new point
          else if (event.originalEvent.button === 0) {
            if (this.sketchFeature && this.sketchFeature.getGeometry().getCoordinates().length > 1) {
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
      event.feature.set('type', 'line', true)
      event.feature.set('color', tools.sidebar.colorInput.value, true)
      event.feature.set('clan', tools.sidebar.clanInput.value, true)
      event.feature.set('lineType', tools.sidebar.lineTypeInput.value)
      this.sketchFeature = event.feature
    })
    this.draw.on('drawend', (event) => {
      this.confirmOverlay.setPosition(undefined)
      this.cancelOverlay.setPosition(undefined)
      event.feature.set('type', 'line', true)
      event.feature.set('color', tools.sidebar.colorInput.value, true)
      event.feature.set('clan', tools.sidebar.clanInput.value, true)
      event.feature.set('lineType', tools.sidebar.lineTypeInput.value)
      this.sketchFeature = null
      tools.emit(tools.EVENT_ICON_ADDED, event.feature)
    })
    this.draw.on('drawabort', () => {
      this.confirmOverlay.setPosition(undefined)
      this.cancelOverlay.setPosition(undefined)
      this.sketchFeature = null
    })
    this.snap = new Snap({features: this.allLinesCollection});

    tools.on(tools.EVENT_FEATURE_SELECTED('line'), this.lineSelected)
    tools.on(tools.EVENT_FEATURE_DESELECTED('line'), this.lineDeSelected)
    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.lineDeSelected)

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
      offset: [-30, 10]
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
      offset: [-50, 10]
    })
    map.addOverlay(this.cancelOverlay)

    tools.on(tools.EVENT_EDIT_MODE_DISABLED, this.toolDeSelected)
    tools.on(tools.EVENT_TOOL_SELECTED, (selectedTool) => {
      if (selectedTool === 'line') {
        this.toolSelected()
      }
      else {
        this.toolDeSelected()
      }
    })

    tools.on(tools.EVENT_DECAY_UPDATED, (data) => {
      if (data.type === 'line') {
        this.allLinesCollection.forEach((line) => {
          if (data.id === line.getId()) {
            line.set('time', data.time)
          }
        })
      }
    })
    tools.on(tools.EVENT_FLAGGED, (data) => {
      if (data.type === 'line') {
        this.allLinesCollection.forEach((line) => {
          if (data.id === line.getId()) {
            line.set('flags', data.flags)
          }
        })
      }
    })
    tools.on(tools.EVENT_FEATURE_UPDATED, ({operation, feature}) => {
      if (feature.get('type') === 'line') {
        if (operation === 'add') {
          this.allLinesCollection.push(feature)
        }
        let editFeature = null
        this.allLinesCollection.forEach((line) => {
          if (feature.getId() === line.getId()) {
            editFeature = line
          }
        })
        if (editFeature && operation === 'update') {
          this.allLinesCollection.remove(editFeature)
          this.allLinesCollection.push(feature)
        }
        else if (editFeature && operation === 'delete') {
          this.allLinesCollection.remove(editFeature)
        }
      }
    })

  }

  geometryCache = {}

  /**
   *
   * @param {import("ol").Feature} feature
   * @returns {*}
   */
  geometryFunction = (feature) => {
    const coordinates = feature.getGeometry().getCoordinates()
    // Skip if not enough points
    if (coordinates.length < 2) {
      return feature.getGeometry()
    }
    if (!feature.getId() || !(feature.getId() in this.geometryCache) || (this.tools.sidebar.editFeature && feature.getId() === this.tools.sidebar.editFeature.getId())) {
      const line = {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "LineString",
          "coordinates": coordinates
        }
      };
      const curved = bezier(line);
      this.geometryCache[feature.getId()] = curved["geometry"]["coordinates"]
    }

    const geometry = new LineString(coordinates);
    geometry.setCoordinates(this.geometryCache[feature.getId()]);
    return geometry;
  };

  style = () => {
    const styles = createEditingStyle();
    const colorInput = this.tools.sidebar.colorInput
    const lineTypeInput = this.tools.sidebar.lineTypeInput
    const getWidthOption = this.getWidthOption
    const getDashedOption = this.getDashedOption
    styles['LineString'] = [
      new Style({
        stroke: new Stroke({
          color: this.tools.sidebar.colorInput.value,
        }),
        geometry: this.geometryFunction
      })
    ]
    return function (feature, resolution) {
      if (feature.getGeometry().getType() === 'LineString') {
        styles['LineString'][0].getStroke().setColor(feature.get('color') || colorInput.value)
        styles['LineString'][0].getStroke().setLineDash(getDashedOption(feature, lineTypeInput.value))
        styles['LineString'][0].getStroke().setWidth(getWidthOption(feature, lineTypeInput.value))
      }
      return styles[feature.getGeometry().getType()];
    };
  }

  toolSelected = () => {
    if (this.tools.sidebar.editFeature) {
      this.tools.emit(this.tools.EVENT_UPDATE_CANCELED, this.tools.sidebar.editFeature)
      this.tools.sidebar.editFeature = null;
    }
    this.map.addInteraction(this.draw);
    this.map.addInteraction(this.snap);
    this.tools.sidebar.displayForm(['clan', 'lineType', 'color', 'notes'])
  }

  toolDeSelected = () => {
    if (this.draw) {
      if (this.draw.getActive()) {
        this.draw.finishDrawing()
      }
      this.map.removeInteraction(this.draw)
      this.map.removeInteraction(this.snap)
    }
    this.tools.sidebar.displayForm(['notes'])
  }

  lineSelected = (feature) => {
    if (!this.tools.hasAccess('track.edit', feature)) {
      this.tools.sidebar.displayForm(['notes'])
      return;
    }
    this.tools.sidebar.editFeature = feature
    this.tools.sidebar.clanInput.value = feature.get('clan') || ''
    this.tools.sidebar.lineTypeInput.value = feature.get('lineType') || 'single'
    this.tools.sidebar.notesInput.value = feature.get('notes') || ''
    this.tools.sidebar.colorInput.value = feature.get('color') || '#555555'
    this.tools.sidebar.setColorInputActive()

    this.tools.sidebar.displayForm(['clan', 'lineType', 'color', 'notes'])
  }

  lineDeSelected = (feature) => {
    this.tools.sidebar.editFeature = null
    this.tools.sidebar.displayForm(['notes'])
  }

  /**
   * Takes an OpenLayer Feature and returns a width 
   * @param {import("ol").Feature} feature - OpenLayer Feature
   * @param {string} lineTypeInput - Optional: Provide a line type to get width of
   * @returns {number} Width size
   */
  getWidthOption = (feature, lineTypeInput = 'single') => {
    const lineType = feature.get('lineType') || lineTypeInput;
    switch (lineType) {
      case 'siding':
        return 3;
      
      case 'lightRail':
        return 2;

      default:
        return 5;
    }
  }

  getDashedOption = (feature, defaultValue = 'single') => {
    const lineType = feature.get('lineType') || defaultValue;
    switch (lineType) {
      case 'water':
        return [30, 15];

      case 'planned':
        return [15, 15];

      case 'pipeline':
        return [5, 30];

      default:
        return undefined;
    }
  }

  createClanLayer = (clan) => {
    const sourceLine = new VectorSource({
      features: new Collection(),
    });

    const vectorLine = new Vector({
      source: sourceLine,
      title: clan,
      style: (feature) => {
        const clanLine = [
          new Style({
            stroke: new Stroke({
              color: feature.get('color'),
              width: this.getWidthOption(feature),
              lineDash: this.getDashedOption(feature)
            }),
            geometry: this.geometryFunction
          })
        ]
        if (feature.get('lineType') === 'lightRail') {
          clanLine.push(
              new Style({
                stroke: new Stroke({
                  color: feature.get('color'),
                  width: 10,
                  lineDash: [1.5, 30],
                  lineCap: 'butt'
                }),
                geometry: this.geometryFunction
              })
          )
        }
        return clanLine
      }
    });
    this.layerGroup.getLayers().push(vectorLine);
    this.sources[clan] = sourceLine
  }

}

module.exports = Line