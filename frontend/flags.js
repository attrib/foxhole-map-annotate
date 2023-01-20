const {getCenter} = require("ol/extent");

class Flags {

  MIN_FLAGS = 1

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
    flaggedItem.querySelector('.notes').innerHTML = this.tools.select.getNotes(feature)
    flaggedItem.querySelector('.flagCount').innerHTML = feature.get('flags').length
    flaggedItem.querySelector('a.target').addEventListener('click', (e) => {
      e.preventDefault()
      this.map.getView().setResolution(0.75)
      this.map.getView().setCenter(getCenter(feature.getGeometry().getExtent()));
      this.tools.select.selectFeature(feature)
    })
    flaggedItem.querySelector('a.delete').addEventListener('click', (e) => {
      e.preventDefault()
      this.tools.emit(this.tools.EVENT_ICON_DELETED, feature)
    })
    return flaggedItem
  }

}


module.exports = Flags