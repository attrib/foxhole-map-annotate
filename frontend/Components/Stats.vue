<template>
  <svg style="width: 100%; height: 100%" viewBox="0 0 14352 12432" xmlns="http://www.w3.org/2000/svg" :onclick="redirect" ref="svgNode">
    <defs>
    <pattern x="0" y="0" width="100" height="100" id="patternWarden" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="100" height="100" fill="#FFFFFFBB" stroke="#245682" stroke-width="4" />
    </pattern>
    <pattern x="0" y="0" width="100" height="100" id="patternColonial" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="100" height="100" fill="#FFFFFFBB" stroke="#516C4B" stroke-width="4" />
    </pattern>
    </defs>
    <g transform="scale (1, -1)">
    <template v-for="feature in staticJson.features?.filter((f) => f.properties.type === 'voronoi')">
      <polygon :id="feature.id" :points="formatPoints(feature)" :fill="fillColor(feature)" stroke="black" stroke-width="5">
        <title>{{ feature.properties.notes }}</title>
      </polygon>
    </template>
    <template v-for="feature in data.warFeatures.features?.filter(shouldTownBeDisplayed)">
      <image transform="scale (1, -1)" :xlink:href="`/images/town/${townSuffix(feature)}.png`" :x="center(feature, 0) - 180" :y="center(feature, 1) * -1 - 620" width="360" height="360">
        <title>{{ feature.properties.notes }}</title>
      </image>
      <circle r="20" :cx="feature.geometry.coordinates[0]" :cy="feature.geometry.coordinates[1]" :fill="fillTown(feature)" stroke="black" stroke-width="2">
        <title>{{ feature.properties.notes }}</title>
      </circle>
    </template>
    <template v-for="feature in staticJson.features?.filter((f) => f.properties.type === 'Region')">
      <text transform="scale (1, -1)" :x="center(feature, 0)" :y="center(feature, 1) * -1" text-anchor="middle" fill="white" font-size="200">
        {{ feature.properties.notes }}
      </text>
      <text transform="scale (1, -1)" :x="center(feature, 0) + 60" :y="center(feature, 1) * -1 + 240" text-anchor="middle" fill="white" font-size="120">
        <title>Warden Queue</title>
        {{ queueStatus.queues[feature.id]?.w || 0 }}
      </text>
      <image transform="scale (1, -1)" xlink:href="/images/humanQueueWarden.png" :x="center(feature, 0) - 160" :y="center(feature, 1) * -1 + 130" width="120" height="120" />
      <text transform="scale (1, -1)" :x="center(feature, 0) + 60" :y="center(feature, 1) * -1 + 380" text-anchor="middle" fill="white" font-size="120">
        <title>Colonial Queue</title>
        {{ queueStatus.queues[feature.id]?.c || 0 }}
      </text>
      <image transform="scale (1, -1)" xlink:href="/images/humanQueueColonial.png" :x="center(feature, 0) - 160" :y="center(feature, 1) * -1 + 270" width="120" height="120" />

      <template v-for="(icon, number) in Object.keys(regionFeatures[feature.id] || {})">
        <image transform="scale (1, -1)" :xlink:href="`/images/stormCannon/${icon}.png`" :x="center(feature, 0) - (Object.keys(regionFeatures[feature.id]).length / 2) * 160 + 160 * number" :y="center(feature, 1) * -1 + 500" width="160" height="160">
          <title>{{iconTitle(icon)}} {{ regionFeatures[feature.id][icon] }}</title>
        </image>
        <text transform="scale (1, -1)" :x="center(feature, 0) - (Object.keys(regionFeatures[feature.id]).length / 2) * 160 + 160 * number + 120" :y="center(feature, 1) * -1 + 660" text-anchor="middle" fill="white" font-size="100">
          {{ regionFeatures[feature.id][icon] }}
        </text>
      </template>
    </template>
    </g>
  </svg>
</template>

<script setup>
import {reactive, ref, watch} from "vue";

const staticJson = reactive({"type":"FeatureCollection","features":[]})
const props = defineProps(['data', 'queueStatus'])
const svgNode = ref(null)
const regionFeatures = reactive({})

fetch("/static.json")
  .then(response => response.json())
  .then(json => {
    staticJson.features = json.features
  });

function center(feature, index) {
  if (feature.properties.type !== 'Region') {
    feature = staticJson.features.find((f) => f.properties.id === feature.properties.region)
  }
  const max = Math.max(...feature.geometry.coordinates[0].map((coordinate) => coordinate[index]))
  const min = Math.min(...feature.geometry.coordinates[0].map((coordinate) => coordinate[index]))
  return (max + min) / 2
}

function formatPoints(feature) {
  return feature.geometry.coordinates.map((coordinate) => {
    if (Array.isArray(coordinate[0])) {
      return coordinate.map((subCoordinate) => {
        return `${subCoordinate[0]},${subCoordinate[1]}`
      }).join('  ')
    }
    return `${coordinate[0]},${coordinate[1]}`
  }).join(' ')
}

function shouldTownBeDisplayed(feature) {
  if (feature.properties.type !== 'town') {
    return false
  }
  return (props.data.conquerStatus.features[feature.id].flags & 0x01) === 1;
}

function iconTitle(icon) {
  switch (icon) {
    case 'MapIconStormCannonWarden':
      return 'Warden Storm Cannon'
    case 'MapIconStormCannonColonial':
      return 'Colonial Storm Cannon'
    case 'MapIconIntelCenterWarden':
      return 'Warden Intel Center'
    case 'MapIconIntelCenterColonial':
      return 'Colonial Intel Center'
    case 'MapIconRocketSiteWarden':
      return 'Warden Rocket Site'
    case 'MapIconRocketSiteColonial':
      return 'Colonial Rocket Site'
    case 'MapIconRocketSiteWithRocketWarden':
      return 'Warden Rocket Site with Rocket'
    case 'MapIconRocketSiteWithRocketColonial':
      return 'Colonial Rocket Site with Rocket'
    case 'MapIconRocketTargetWarden':
      return 'Warden Rocket Target'
    case 'MapIconRocketTargetColonial':
      return 'Colonial Rocket Target'
    case 'MapIconRocketGroundZeroWarden':
      return 'Warden Rocket Ground Zero'
    case 'MapIconRocketGroundZeroColonial':
      return 'Colonial Rocket Ground Zero'
    default:
      return icon
  }
}

watch(props.data, (data) => {
  if (!data.conquerStatus.features) {
    return
  }
  for (const region of Object.keys(regionFeatures)) {
    delete regionFeatures[region]
  }
  for (let feature of Object.values(data.conquerStatus.features)) {
    if (!['MapIconStormCannon', 'MapIconIntelCenter', 'MapIconRocketSite', 'MapIconRocketSiteWithRocket', 'MapIconRocketTarget', 'MapIconRocketGroundZero'].includes(feature.icon)) {
      continue
    }
    if (!(feature.region in regionFeatures)) {
      regionFeatures[feature.region] = {}
    }
    const icon = feature.icon + feature.team
    if (!(icon in regionFeatures[feature.region])) {
      regionFeatures[feature.region][icon] = 0
    }
    regionFeatures[feature.region][icon]++
  }
})

function fillColor(feature) {
  if (!props.data.conquerStatus.features) {
    return 'black'
  }
  const town = props.data.warFeatures.features.find((f) => f.properties.voronoi === feature.id)
  if (town.id in props.data.conquerStatus.features) {
    if (props.data.conquerStatus.features[town.id].team === '') {
      return `url(#pattern${props.data.conquerStatus.features[town.id].lastTeam})`;
    }
    return getColor(props.data.conquerStatus.features[town.id])
  }
  return 'transparent'
}

function fillTown(feature) {
  if (!props.data.conquerStatus.features) {
    return 'black'
  }
  if (feature.id in props.data.conquerStatus.features) {
    return getColor(props.data.conquerStatus.features[feature.id])
  }
  return 'transparent'
}

function townSuffix(feature) {
  if (!props.data.conquerStatus.features) {
    return feature.properties.icon
  }
  if (feature.id in props.data.conquerStatus.features) {
    const status = props.data.conquerStatus.features[feature.id]
    if (status.flags & 0x10) {
      return status.icon + 'Nuke'
    }
    return status.icon + status.team
  }
  return feature.properties.icon
}

function getColor(conquerStatus) {
  if ((conquerStatus.flags & 0x10) === 1) {
    return 'black'
  }
  let hue = Date.now() - (conquerStatus.lastChange || Date.now() - 86400000)
  if (hue >= 86400000) {
    hue = 'BB'
  }
  else {
    hue = Math.floor(255 - (hue / 86400000) * 68).toString(16).padStart(2, '0')
  }
  if (conquerStatus.team === 'Warden') {
    return '#245682' + hue
  }
  if (conquerStatus.team === 'Colonial') {
      return '#516C4B' + hue
  }
  return '#FFFFFFBB'
}

function redirect(event) {
  let pt = DOMPoint.fromPoint(svgNode);
  pt.x = event.clientX;
  pt.y = event.clientY;
  let cursorpt =  pt.matrixTransform(svgNode.value.getScreenCTM().inverse());
  const loggedIn = document.getElementById('discord-username')
  if (loggedIn) {
    window.location.href = `/?cx=${cursorpt.x}&cy=${cursorpt.y * -1}&r=2.50000`
  }
}

</script>

<script>
export default {
  name: "Stats",
}
</script>

<style scoped>

</style>