<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ConstructionScene } from '@/three/construction3d'
import { useConstructionStore } from '@/stores/construction'

const container = ref<HTMLDivElement | null>(null)
const c = useConstructionStore()
let scene: ConstructionScene | null = null
let ro: ResizeObserver | null = null

onMounted(() => {
  if (!container.value) return
  scene = new ConstructionScene(container.value)
  scene.setTime(c.timeT, c.dam.progress, c.cutProgress.find((z) => z.id === 'upper')?.progress ?? 0)
  ro = new ResizeObserver(() => scene?.resize())
  ro.observe(container.value)
})

watch(
  () => c.timeT,
  () => {
    scene?.setTime(
      c.timeT,
      c.dam.progress,
      c.cutProgress.find((z) => z.id === 'upper')?.progress ?? 0
    )
  }
)

onBeforeUnmount(() => {
  ro?.disconnect()
  scene?.dispose()
  scene = null
})
</script>

<template>
  <div class="cs-wrap">
    <div ref="container" class="cs-canvas" />
    <div class="cs-legend">
      <span><i style="background:#ffc02a" />渣土车(挖→坝)</span>
      <span><i style="background:#6b5e44" />上库开挖</span>
      <span><i style="background:#8a8f98" />堆石坝</span>
      <span><i style="background:#16b6ff" />蓄水</span>
    </div>
    <div class="cs-month">{{ c.monthText }}</div>
  </div>
</template>

<style scoped>
.cs-wrap { position: relative; width: 100%; height: 100%; }
.cs-canvas { width: 100%; height: 100%; }
.cs-legend {
  position: absolute; left: 14px; top: 56px;
  display: flex; flex-direction: column; gap: 5px;
  background: rgba(8,18,32,0.7); border: 1px solid var(--border-line);
  padding: 8px 12px; border-radius: 5px; font-size: 12px; color: var(--text-secondary);
}
.cs-legend span { display: flex; align-items: center; gap: 7px; }
.cs-legend i { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
.cs-month {
  position: absolute; right: 16px; top: 56px;
  font-size: 20px; font-weight: 700; color: var(--accent-cyan);
  font-variant-numeric: tabular-nums; letter-spacing: 1px;
  text-shadow: 0 0 12px rgba(0,212,255,0.5);
  background: rgba(8,18,32,0.6); padding: 4px 12px; border-radius: 5px;
}
</style>
