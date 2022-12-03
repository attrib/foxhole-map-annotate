const sanitizeHtml = require("sanitize-html");
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

function featureUpdater(data) {

  return data
}

/**
 * Moved all to single file now
 * @deprecated
 * @see featureUpdater
 */
function iconUpdater(data) {
  for (const feature of data.features) {
    if (feature.properties.type === 'custom_facility') {
      feature.properties.type = 'facility-custom';
    }
    if (feature.properties.sign) {
      feature.properties.icon = feature.properties.sign
      delete feature.properties.sign
    }
    if (feature.properties.icon && feature.properties.icon.endsWith('_field')) {
      feature.properties.type = 'field'
      if (feature.properties.notes.toLowerCase().includes('mine')) {
        feature.properties.icon = feature.properties.icon.replace('_field', '_mine')
      }
    }
    if (feature.properties.icon && feature.properties.icon === 'no_entry') {
      feature.properties.icon = 'no_entry_sign'
    }
    if (feature.properties.id) {
      feature.id = feature.properties.id;
    }
    if (feature.properties.icon && feature.properties.icon === 'seaport_inland_port') {
      feature.properties.icon = 'Rail_Yard'
    }
    if (feature.properties.icon && feature.properties.icon === 'maintenance') {
      feature.properties.type = 'facility'
    }
    if (feature.properties.icon && ['enemy_base', 'enemy_base_frontline', 'enemy_base_obs', 'enemy_base_sleep'].includes(feature.properties.icon)) {
      feature.properties.type = 'facility-enemy'
    }
    if (feature.properties.notes === 'undefined') {
      feature.properties.notes = ''
    }
    feature.properties.notes = sanitizeHtml(feature.properties.notes || '', sanitizeOptions)
    delete feature.properties.clan

    if (feature.properties.type === 'facility-custom') {
      feature.properties.type = 'polygon';
      if (!feature.properties.color) {
        feature.properties.color = '#555555AA'
      }
    }
  }
  data.features = data.features.filter((feature) => feature.properties.type !== 'field')
  return data
}

/**
 * Moved all to single file now
 * @deprecated
 * @see featureUpdater
 */
function trackUpdater(data) {
  for (const feature of data.features) {
    feature.properties.type = 'line'
    feature.properties.lineType = 'single'
    if (feature.properties.clan === 'undefined') {
      feature.properties.clan = ''
    }
    feature.properties.clan = sanitizeHtml(feature.properties.clan || '', sanitizeOptionsClan)
    if (feature.properties.notes === 'undefined') {
      feature.properties.notes = ''
    }
    feature.properties.notes = sanitizeHtml(feature.properties.notes || '', sanitizeOptions)
  }
  return data
}

module.exports = {
  iconUpdater,
  trackUpdater,
  featureUpdater
}