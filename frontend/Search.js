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
      const map = this.getMap();
      if (map) {
        map.getView().animate({
          center: getCenter(e.search.getGeometry().getExtent()),
          resolution: e.search.get('type') === 'Region' ? 1.75 : 0.75,
          duration: 2000,
        })
      }
    });
  }

  getSearchString(f) {
    return this.getTitle(f);
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
      if (layer.getSource?.().getFeatures && searchableLayer) {
        // search by notes
        const features = layer.getSource().getFeatures()
        for (const feature of features) {
          let att = this.getSearchString(feature);
          if (att) {
            att.replaceAll("\n", ' ')
          };
          if (att && rex.test(att)) {
            result.push(feature);
            if ((--max) <= 0) {
              break;
            }
            continue;
          }
          // search by username
          const user = feature.get('user');
          if (user !== undefined && rex.test(user)) {
            result.push(feature);
            if ((--max) <= 0) {
              break;
            }
            continue;
          }
          // search by clan
          const clan = feature.get('clan');
          if (clan !== undefined && rex.test(clan)) {
            result.push(feature);
            if ((--max) <= 0) {
              break;
            }
          }
        }
      }
    });
    return result;
  }

}

export default Search