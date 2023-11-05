<template>
  <svg style="width: 100%; height: 100%" viewBox="0 0 14352 12432" xmlns="http://www.w3.org/2000/svg">
    <g transform="scale (1, -1)">
    <template v-for="feature in staticJson.features?.filter((f) => f.properties.type === 'voronoi')">
      <polygon :id="feature.id" :points="formatPoints(feature)" :fill="fillColor(feature)" stroke="black" stroke-width="5">
        <title>{{ feature.properties.notes }}</title>
      </polygon>
    </template>
    <template v-for="feature in data.warFeatures.features?.filter(shouldTownBeDisplayed)">
      <circle r="20" :cx="feature.geometry.coordinates[0]" :cy="feature.geometry.coordinates[1]" :fill="fillTown(feature)" stroke="black" stroke-width="2">
        <title>{{ feature.properties.notes }}</title>
      </circle>
    </template>
    <template v-for="feature in staticJson.features?.filter((f) => f.properties.type === 'Region')">
      <text transform="scale (1, -1)" :x="center(feature, 0)" :y="center(feature, 1) * -1" text-anchor="middle" fill="white" font-size="200">
        {{ feature.properties.notes }}
      </text>
      <text transform="scale (1, -1)" :x="center(feature, 0)" :y="center(feature, 1) * -1 + 240" text-anchor="middle" fill="white" font-size="120">
        Wa Queue: {{ queueStatus.queues[feature.id]?.w || 0 }}
      </text>
      <text transform="scale (1, -1)" :x="center(feature, 0)" :y="center(feature, 1) * -1 + 380" text-anchor="middle" fill="white" font-size="120">
        Co Queue: {{ queueStatus.queues[feature.id]?.c || 0 }}
      </text>
    </template>
    </g>
  </svg>
</template>

<script setup>
import {reactive} from "vue";

const staticJson = reactive({"type":"FeatureCollection","features":[]})
const props = defineProps(['data', 'queueStatus'])

fetch("/static.json")
  .then(response => response.json())
  .then(json => {
    staticJson.features = json.features
  });

function center(feature, index) {
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

function fillColor(feature) {
  if (!props.data.conquerStatus.features) {
    return 'black'
  }
  const town = props.data.warFeatures.features.find((f) => f.properties.voronoi === feature.id)
  if (town.id in props.data.conquerStatus.features) {
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

function getColor(conquerStatus) {
  if ((conquerStatus.flags & 0x10) === 1) {
    return 'black'
  }
  if (conquerStatus.team === 'Warden') {
    return '#245682FF'
  }
  if (conquerStatus.team === 'Colonial') {
      return '#516C4BFF'
  }
  return '#FFFFFFBB'
}

</script>

<script>
export default {
  name: "Stats",
}
</script>

<style scoped>

</style>