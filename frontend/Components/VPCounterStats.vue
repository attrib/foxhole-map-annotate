<template>
    <div class="team-score">
        <img src="/images/colonial.webp" alt="Colonial" title="Colonial">
        {{ score.Colonial }}<span v-if="score.ColonialUnclaimed" title="Not yet claimed!">(+{{ score.ColonialUnclaimed }})</span>/{{ score.requiredVPs }}
    </div>
    <div class="team-score">
        {{ score.Warden }}<span v-if="score.WardenUnclaimed" title="Not yet claimed!">(+{{ score.WardenUnclaimed }})</span>/{{ score.requiredVPs }}
        <img src="/images/warden.webp" alt="Warden" title="Warden">
    </div>
</template>

<script setup>
import { reactive, watch } from "vue";

const props = defineProps(['data'])

const score = reactive({Warden: 0, Colonial: 0, None: 0, WardenUnclaimed: 0, ColonialUnclaimed: 0, NoneUnclaimed: 0, requiredVPs: props.totalScore || 32})

document.getElementById('war-score')?.setAttribute("data-vp-loaded", "");

watch(
    props.data,
    (data) => {
        score.requiredVPs = data.conquerStatus.requiredVictoryTowns || 32
        score.Warden = 0
        score.WardenUnclaimed = 0
        score.Colonial = 0
        score.ColonialUnclaimed = 0
        data.warFeatures.features.forEach((mapFeature) => {
            const feature = data.conquerStatus.features[mapFeature.id]
            const flags = feature?.flags || 0
            if (!(flags & 0x01)) {
                return
            }
           if (flags & 0x10) {
                score.requiredVPs--
            } else if (flags & 0x20) {
                score[feature.team]++
            } else if (flags & 0x01) {
                score[feature.team + 'Unclaimed']++
            }
        })
    }
)
</script>

<script>
export default {
  name: "VPCounterStats",
}
</script>

<style scoped>

</style>