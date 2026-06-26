<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { usePlantStore } from '@/stores/plant'

const plant = usePlantStore()

let lastTs = 0
let rafId = 0
function loop(ts: number) {
  if (lastTs === 0) lastTs = ts
  const dt = (ts - lastTs) / 1000
  lastTs = ts
  plant.tick(Math.min(dt, 0.2))
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
  <router-view />
</template>
