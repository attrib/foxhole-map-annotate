const ADrawTool = require("./ADrawTool");
const Split = require("ol-ext/interaction/Split");
const {Style, Stroke} = require("ol/style");

class TrackSplit extends ADrawTool
{

  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  constructor(tools, map) {
    super(tools, map, 'trackSplit', 'scissors', {
      title: 'Track split',
      left: '2em',
    });

    this.split = new Split.default({
    })

    this.split.on('aftersplit', (event) => {
      const oldFeature = event.features[0];
      tools.emit(tools.EVENT_TRACK_UPDATED, oldFeature)
      const newFeature = event.features[1]
      newFeature.set('id', null)
      tools.emit(tools.EVENT_TRACK_ADDED, {
        clan: newFeature.get('clan'),
        color: newFeature.get('color'),
        notes: newFeature.get('notes'),
        feature: newFeature
      })
    })
  }

  toolSelected = () => {
    this.map.addInteraction(this.split)
  }

  toolDeSelected = () => {
    this.map.removeInteraction(this.split)
  }


}


module.exports = TrackSplit