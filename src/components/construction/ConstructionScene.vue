<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ConstructionScene } from '@/three/construction3d'
import { useConstructionStore } from '@/stores/construction'
import { FILL_ZONES } from '@/data/construction'

const container = ref<HTMLDivElement | null>(null)
const c = useConstructionStore()
let scene: ConstructionScene | null = null
let ro: ResizeObserver | null = null

onMounted(() => {
  if (!container.value) return
  scene = new ConstructionScene(container.value)
  const dam = FILL_ZONES.find((z) => z.id === 'upperDam')
  scene.setDamProgress(dam ? dam.progress : 0.58)
  ro = new ResizeObserver(() => scene?.resize())
  ro.observe(container.value)
})

watch(
  () => c.overallProgress,
  () => {
    const dam = FILL_ZONES.find((z) => z.id === 'upperDam')
    scene?.setDamProgress(dam ? dam.progress : 0.58)
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
      <span><i style="background:#ffc02a" />渣土车</span>
      <span><i style="background:#6b5e44" />开挖坑</span>
      <span><i style="background:#8a8f98" />堆石坝</span>
      <span><i style="background:#7a6b50" />弃渣场</span>
    </div>
    <div class="cs-hint"><span class="dot" />拖动旋转 · 滚轮缩放 · 施工场景三维示意</div>
  </div>
</template>

<style scoped>
.cs-wrap { position: relative; width: 100%; height: 100%; }
.cs-canvas { width: 100%; height: 100%; }
.cs-legend {
  position: absolute; left: 14px; top: 14px;
  display: flex; flex-direction: column; gap: 5px;
  background: rgba(8,18,32,0.7); border: 1px solid var(--border-line);
  padding: 8px 12px; border-radius: 5px; font-size: 12px; color: var(--text-secondary);
}
.cs-legend span { display: flex; align-items: center; gap: 7px; }
.cs-legend i { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
.cs-hint {
  position: absolute; left: 14px; bottom: 12px;
  font-size: 12px; color: var(--text-secondary);
  display: flex; align-items: center; gap: 6px;
  background: rgba(8,18,32,0.6); padding: 5px 10px; border-radius: 4px;
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-cyan); box-shadow: 0 0 8px var(--accent-cyan); }
</style>
