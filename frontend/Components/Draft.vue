<template>
  <div class="alert alert-info row" v-if="draftStatus.active">
    <div v-if="draftStatus.activeDraft === null" class="col-8">
        Claiming will start soon, map drawing is disabled until then.
    </div>
    <div v-else-if="draftStatus.draftOrder[draftStatus.activeDraft].discordId === userDiscordId.value || draftStatus.draftOrder[draftStatus.activeDraft].userId === userId" class="col-8">
        You are claiming
        <button @click="socket.send('draftConfirm', {})" class="btn btn-info">Finished claim</button>
    </div>
    <div v-else class="col-8">
        Currently claiming: {{draftStatus.draftOrder[draftStatus.activeDraft].name}}
    </div>
    <div class="col-4 text-end">
        Timer: {{timer}}
    </div>
    <div v-if="draftStatus.draftOrder.length > ((draftStatus.activeDraft ?? 0)+1)" class="col-12">
        <span v-if="draftStatus.draftOrder[(draftStatus.activeDraft ?? 0)+1].discordId === userDiscordId.value || draftStatus.draftOrder[(draftStatus.activeDraft ?? 0)].userId === userId">
          You are next
        </span>
        <span v-else>
          Next up: {{draftStatus.draftOrder[draftStatus.activeDraft + 1].name}}
        </span>
    </div>
    <div class="col-12">For more information on claiming, see the <a href="{{draftStatus.draftUrl}}">Warden Alliance Discord.</a></div>
    <div v-if="admin.value" class="col-12">
        <button @click="socket.send('draftConfirm', {})" class="btn btn-info">Force finish (no next chance)</button>
        <button @click="socket.send('draftForceNext', {})" class="btn btn-info">Force next (next chance after next claimant)</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";

const props = defineProps(['socket', 'userDiscordId', 'admin', 'userId'])

const draftStatus = reactive({
  active: false,
  timeEnd: null,
  draftOrder: [],
  activeDraft: null,
  draftUrl: '',
})

const timer = ref(formatTimer())

function formatTimer() {
  if (!draftStatus.active) {
    return ''
  }
  const totalSeconds = (draftStatus.timeEnd - Date.now())/1000
  if (totalSeconds < 0) {
    return '00:00'
  }
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(Math.floor(totalSeconds % 60)).padStart(2, '0')}`
}

let timerTimeout = null

if (!props.socket.socketClosed) {
  props.socket.send('getDraftStatus', {})
}

props.socket.on('draftStatus', (data) => {
  console.log('draftStatus', data)
  if (timerTimeout) {
    clearInterval(timerTimeout)
  }
  if (data.active) {
    draftStatus.active = data.active
    draftStatus.timeEnd = data.timeEnd
    draftStatus.draftOrder = data.draftOrder
    draftStatus.activeDraft = data.activeDraft
    timerTimeout = setInterval(() => {
      timer.value = formatTimer()
    }, 1000)
  }
  else {
    draftStatus.active = false
    draftStatus.timeEnd = null
    draftStatus.draftOrder = []
    draftStatus.activeDraft = null
  }
})

props.socket.on('init', (data) => {
  props.socket.send('getDraftStatus', {})
})

</script>

<script>
export default {
  name: "Draft"
}
</script>

<style scoped>

</style>