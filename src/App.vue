<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { usePlantStore } from '@/stores/plant'
import { useConstructionStore } from '@/stores/construction'
import IntroSplash from '@/components/layout/IntroSplash.vue'

const plant = usePlantStore()
const construction = useConstructionStore()
const showSplash = ref(true)

let lastTs = 0
let rafId = 0
function loop(ts: number) {
  if (lastTs === 0) lastTs = ts
  const dt = (ts - lastTs) / 1000
  lastTs = ts
  plant.tick(Math.min(dt, 0.2))
  construction.tick(Math.min(dt, 0.2))
  rafId = requestAnimationFrame(loop)
}

onMounted(() => {
  rafId = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <IntroSplash v-if="showSplash" @done="showSplash = false" />
  <router-view />
</template>
