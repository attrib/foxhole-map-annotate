const {Interaction} = require("ol/interaction");
const {Vector: VectorSource} = require("ol/source");
const {Vector} = require("ol/layer");
const {Collection, Feature} = require("ol");
const {Point, LineString} = require("ol/geom");
const {createEditingStyle} = require("ol/style/Style");

class Merge extends Interaction {
  constructor(options) {
    super({
      handleEvent: (e) => {
        switch (e.type) {
          case "singleclick":
            return this.handleDownEvent(e)
          case "pointermove":
            return this.handleMoveEvent(e)
          default:
            return true
        }
      }
    });
    this.features = options.features

    const addFeature = (feature) => {
      const coordinates = feature.getGeometry().getCoordinates();
      this.source.addFeature(new Feature({
        geometry: new Point(coordinates[0]),
        featureId: feature.getId(),
        last: false,
      }))
      this.source.addFeature(new Feature({
        geometry: new Point(coordinates[coordinates.length - 1]),
        featureId: feature.getId(),
        last: true,
      }))
    }
    this.features.on('add', (e) => {
      addFeature(e.element)
    })
    this.features.on('remove', (e) => {
      const coordinates = e.element.getGeometry().getCoordinates()
      for (const point of [coordinates[0], coordinates[coordinates.length - 1]]) {
        this.source.getFeaturesAtCoordinate(point).forEach((feature) => {
          if (e.element.getId() === feature.get('featureId')) {
            this.source.removeFeature(feature)
            return true
          }
        })
      }
    })

    this.features.forEach(addFeature)

    const styles = createEditingStyle()

    this.source = new VectorSource({
      features: new Collection([]),
    })
    this.layer = new Vector({
      zIndex: 100,
      source: this.source,
      style: (feature) => {
        return styles[feature.getGeometry().getType()]
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    })
  }

  setMap(map) {
    if (this.getMap()) {
      this.getMap().removeLayer(this.layer)
    }
    super.setMap(map);
    if (map) {
      map.addLayer(this.layer)
    }
  }

  handleDownEvent(event) {
    return this.getMap().forEachFeatureAtPixel(event.pixel, (feature) => {
      if (!this.sketch) {
        this.sketch = new Feature({
          geometry: new LineString([feature.getGeometry().getCoordinates(), feature.getGeometry().getCoordinates()]),
          featureId: feature.get('featureId'),
          last: feature.get('last'),
        })
        this.source.addFeature(this.sketch)
        return true
      }

      // No loops, also allows to merge on the same point, as we skip to the next feature at pixel
      if (this.sketch.get('featureId') === feature.get('featureId')) {
        return false;
      }
      const lines = {}
      this.features.forEach((feat) => {
        if (feat.getId() === feature.get('featureId') || feat.getId() === this.sketch.get('featureId')) {
          lines[feat.getId()] = feat
        }
      })

      const newFeature = lines[this.sketch.get('featureId')].clone()
      const secondFeature = lines[feature.get('featureId')]
      newFeature.set('id', null)
      let coords = newFeature.getGeometry().getCoordinates()
      let coords2 = [...secondFeature.getGeometry().getCoordinates()]
      if (feature.get('last')) {
        coords2.reverse()
      }
      if (this.sketch.get('last')) {
        coords.push(...coords2)
      }
      else {
        coords.reverse().push(...coords2)
      }

      const duplicateCoordinateCheck = {}
      const newCoords = []
      for (const coord of coords) {
        const key = coord[0] + '-' + coord[1]
        if (!(key in duplicateCoordinateCheck)) {
          duplicateCoordinateCheck[key] = true
          newCoords.push(coord)
        }
      }
      newFeature.getGeometry().setCoordinates(newCoords)

      if (newFeature.get('clan') !== secondFeature.get('clan')) {
        let clan = [newFeature.get('clan'), secondFeature.get('clan')]
        clan = clan.filter((c) => c)
        newFeature.set('clan', clan.join(' & '))
      }
      if (newFeature.get('notes') !== secondFeature.get('notes')) {
        let notes = [newFeature.get('notes'), secondFeature.get('notes')]
        notes = notes.filter((c) => c)
        newFeature.set('notes', notes.join("\n"))
      }

      this.dispatchEvent({type: 'mergedLine', oldFeatures: Object.values(lines), newFeature: newFeature})

      this.source.removeFeature(this.sketch)
      this.sketch = null
      return true;
    }, {
      layerFilter: (l) => {
        return l === this.layer
      }
    })
  }

  handleMoveEvent(event) {
    if (this.sketch) {
      const coords = this.sketch.getGeometry().getCoordinates()
      coords[1] = event.coordinate
      this.sketch.getGeometry().setCoordinates(coords)
    }
  }
}

module.exports = Merge