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

const props = defineProps(['totalScore', 'townFeatures'])

const score = reactive({Warden: 0, Colonial: 0, None: 0, WardenUnclaimed: 0, ColonialUnclaimed: 0, NoneUnclaimed: 0, requiredVPs: props.totalScore || 32})

document.getElementById('war-score')?.setAttribute("data-vp-loaded", "");

watch(
    props.townFeatures,
    (townFeatures) => {
        score.requiredVPs = props.totalScore || 32
        score.Warden = 0
        score.WardenUnclaimed = 0
        score.Colonial = 0
        score.ColonialUnclaimed = 0
        townFeatures.forEachFeature((feature) => {
            const flags = feature.get('iconFlags') || 0
            if (!(flags & 0x01)) {
                return
            }
            if (flags & 0x10) {
                score.requiredVPs--
            } else if (flags & 0x20) {
                score[feature.get('team')]++
            } else if (flags & 0x01) {
                score[feature.get('team') + 'Unclaimed']++
            }
        })
    }
)
</script>

<script>
export default {
  name: "VPCounter",
}
</script>

<style scoped>

</style>