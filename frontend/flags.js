import {getCenter} from "ol/extent";

class Flags {

  MIN_FLAGS = 1

  /**
   * @param {EditTools}  tools
   * @param {import("ol").Map} map
   */
  constructor(map, tools) {
    this.tools = tools
    this.map = map

    const divFlagged = document.querySelector('#flagged tbody')
    this.template = document.getElementById('flaggedTemplate').content

    const offcanvas = document.getElementById('flags')
    this.bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvas ,{ keyboard: true, backdrop: false, scroll: true})
    offcanvas.addEventListener('show.bs.offcanvas', () => {
      divFlagged.innerHTML = ''
      const features = []
      for (const source of Object.values(tools.icon.sources)) {
        for (const feature of source.getFeatures()) {
          if ((feature.get('flags') || []).length < this.MIN_FLAGS) {
            continue;
          }
          features.push(feature)
        }
      }
      tools.line.allLinesCollection.forEach((feature) => {
        if ((feature.get('flags') || []).length < this.MIN_FLAGS) {
          return;
        }
        features.push(feature)
      })
      for (const feature of tools.polygon.source.getFeatures()) {
        if ((feature.get('flags') || []).length < this.MIN_FLAGS) {
          continue;
        }
        features.push(feature)
      }

      features.sort((a, b) => {
        const diff = b.get('flags').length - a.get('flags').length;
        if (diff !== 0) {
          return diff
        }
        return a.get('time').localeCompare(b.get('time'))
      })
      features.forEach((feature) => {
        divFlagged.append(this.createFlaggedItem(feature))
      })
    })

    tools.on(tools.EVENT_FEATURE_UPDATED, ({operation, feature}) => {
      if (operation === 'delete') {
        const element = document.getElementById('flag-' + feature.getId())
        if (element) {
          element.remove()
        }
      }
    })
    tools.on(tools.EVENT_FLAGGED, ({id, type, flags}) => {
      if (flags) {
        const element = document.getElementById('flag-' + id)
        if (flags.length === 0 && element) {
          element.remove();
        }
        else if (flags.length > 0 && !element) {
          const feature = this.findFeature(id, type)
          if (feature) {
            divFlagged.append(this.createFlaggedItem(feature))
          }
        }
      }
    })
  }

  findFeature = (id, type) => {
    let feature
    for (const source of Object.values(this.tools.icon.sources)) {
      feature = source.getFeatureById(id)
      if (feature) {
        return feature;
      }
    }
    feature = this.tools.line.allLinesCollection.getFeatureById(id)
    if (feature) {
      return feature;
    }
    feature = this.tools.polygon.source.getFeatureById(id)
    if (feature) {
      return feature;
    }
    return null
  }

  createFlaggedItem = (feature) => {
    const flaggedItem = this.template.cloneNode(true)
    flaggedItem.querySelector('tr').id = 'flag-' + feature.getId()
    if (feature.get('type') === 'line') {
      flaggedItem.querySelector('.icon').innerHTML = '<i class="bi bi-pencil"></i>'
    }
    else if (feature.get('type') === 'polygon') {
      flaggedItem.querySelector('.icon').innerHTML = '<i class="bi bi-hexagon"></i>'
    }
    else {
      flaggedItem.querySelector('.icon').innerHTML = '<img src="' + this.tools.icon.getImageUrl(feature) + '">'
    }
    flaggedItem.querySelector('.user').innerHTML = feature.get('user')
    //flaggedItem.querySelector('.notes').innerHTML = this.tools.select.getNotes(feature)
    flaggedItem.querySelector('.flagCount').innerHTML = feature.get('flags').length
    flaggedItem.querySelector('a.target').addEventListener('click', (e) => {
      e.preventDefault()
      this.map.getView().animate({
        resolution: 0.75,
        center: getCenter(feature.getGeometry().getExtent()),
        duration: 1000,
      })
      this.tools.select.selectFeature(feature)
    })
    flaggedItem.querySelector('a.confirm').addEventListener('click', (e) => {
      e.preventDefault()
      this.tools.emit(this.tools.EVENT_UNFLAG, {id: feature.getId()})
    })
    flaggedItem.querySelector('a.delete').addEventListener('click', (e) => {
      e.preventDefault()
      this.tools.emit(this.tools.EVENT_ICON_DELETED, feature)
    })
    return flaggedItem
  }

}


export default Flags