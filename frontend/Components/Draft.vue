<template>
  <div class="alert alert-info row" v-if="draftStatus.active">
    <div v-if="draftStatus.draftOrder[draftStatus.activeDraft].discordId === userDiscordId" class="col-8">
        You are claiming
        <button @click="socket.emit('draftConfirm')" class="btn btn-info">Finished claim</button>
    </div>
    <div v-else-if="draftStatus.discordId !== userDiscordId" class="col-8">
        Currently claiming: {{draftStatus.draftOrder[draftStatus.activeDraft].name}}
    </div>
    <div class="col-4 text-end">
        Timer: {{timer}}
    </div>
    <div v-if="draftStatus.draftOrder.length > (draftStatus.activeDraft+1)" class="col-12">
        <span v-if="draftStatus.draftOrder[draftStatus.activeDraft+1].discordId === userDiscordId">
          You are next
        </span>
        <span v-else>
          Next up: {{draftStatus.draftOrder[draftStatus.activeDraft + 1].name}}
        </span>
    </div>
    <div class="col-12">For more information on drafting, see the Warden Alliance Discord.</div>
    <div v-if="admin" class="col-12">
        <button @click="socket.send('draftConfirm', {})" class="btn btn-info">Force Next</button>
    </div>
  </div>
</template>

<script setup>
import {reactive, ref} from "vue";

const props = defineProps(['socket', 'userDiscordId', 'admin'])

const draftStatus = reactive({
  active: false,
  timeEnd: null,
  draftOrder: [],
  activeDraft: null,
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