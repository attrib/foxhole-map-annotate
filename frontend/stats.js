import { createApp, reactive } from "vue";

import Stats from "./Components/Stats.vue";
import VPCounterStats from "./Components/VPCounterStats.vue";
import Socket from "./webSocket.js";


const data = reactive({
  version: null,
  warStatus: '',
  requiredVictoryTowns: 32,
  conquerStatus: {},
  warFeatures: {}
})

const queue = reactive({queues: {}})

const socket = new Socket('/stats')
socket.on('init', (initData) => {
  if (data.version === null) {
    data.version = initData.version
  } else if (data.version !== initData.version) {
    window.location.reload()
  }
  data.requiredVictoryTowns = initData.requiredVictoryTowns
  data.warStatus = initData.warStatus
  data.conquerStatus = initData.conquerStatus
  data.warFeatures = initData.warFeatures
  queue.queues = initData.queueStatus.queues
});

socket.on('conquer', (conquerData) => {
  if (data.conquerStatus.version === conquerData.version) {
    return
  }
  if (!conquerData.full && conquerData.oldVersion !== data.conquerStatus.version) {
    socket.send('getConquerStatus', true)
    return
  }
  data.conquerStatus.version = conquerData.version
  data.conquerStatus.features = conquerData.full ? conquerData.features : {...data.conquerStatus.features, ...conquerData.features}
  data.conquerStatus.warNumber = conquerData.warNumber
});

socket.on('queue', (queues) => {
  queue.queues = queues.queues
})

createApp(Stats, {
  data: data,
  queueStatus: queue,
}).mount('#map')

createApp(VPCounterStats, {
  data: data,
}).mount('#war-score')