function iconUpdater(data) {
  for (const feature of data.features) {
    if (feature.properties.type === 'custom_facility') {
      feature.properties.type = 'facility-custom';
    }
    if (feature.properties.type === 'custom-facility') {
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
  }
  return data
}

function trackUpdater(data) {
  return data
}

module.exports = {
  iconUpdater,
  trackUpdater
}