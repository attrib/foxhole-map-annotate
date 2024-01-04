import sanitizeHtml from "sanitize-html";

const sanitizeOptions = {
  allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p', 'img', 'video', 'source' ],
  allowedAttributes: {
    'a': [ 'href', 'title' ],
    'img': [ 'src', 'alt', 'title', 'width', 'height' ],
    'video': [ 'width', 'height' ],
    'source': [ 'src', 'type' ],
  },
};
const sanitizeOptionsClan = {
  allowedTags: [ ],
  allowedAttributes: { },
};

/**
 * Feature updater injection point to modify active data
 * @param {import("./featureLoader.js").UserMapFeatures} data 
 * @returns 
 */
export function featureUpdater(data) {
  data.features.forEach((feature) => {
    // happens when copy defaultFeatures to features.json manually
    // also ui has issues if time is missing, so making sure its always there
    if (!('time' in feature.properties)) {
      feature.properties.time = (new Date()).toISOString()
    }
  })
  return data
}
