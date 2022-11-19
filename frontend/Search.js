import SearchFeature from "ol-ext/control/SearchFeature";
import LayerSwitcher from "ol-layerswitcher";
import {getCenter} from "ol/extent";

class Search extends SearchFeature {

  constructor() {
    super({
      className: 'feature-search text-bg-light',
      property: 'notes',
    });

    this.on('select', function (e) {
      var map = this.getMap();
      if (map) {
        map.getView().setResolution(1.75)
        map.getView().setCenter(getCenter(e.search.getGeometry().getExtent()));
      }
    });
  }

  getSearchString(f) {
    return this.getTitle(f).replaceAll("\n", ' ');
  }

  autocomplete(search) {
    const result = [];
    search = search.replace(/^\*/, '');
    const rex = new RegExp(search, 'i');
    let max = this.get('maxItems');
    LayerSwitcher.forEachRecursive(this.getMap(), (layer) => {
      if (max <= 0) {
        return
      }
      const searchableLayer = layer.get('searchable') !== undefined ? layer.get('searchable') : true
      if (layer.getSource && layer.getSource().getFeatures && searchableLayer) {
        const features = layer.getSource().getFeatures()
        for (const feature of features) {
          const att = this.getSearchString(feature);
          if (att !== undefined && rex.test(att)) {
            result.push(feature);
            if ((--max) <= 0)
              break;
          }
        }
      }
    });
    return result;
  }

}

export default Search