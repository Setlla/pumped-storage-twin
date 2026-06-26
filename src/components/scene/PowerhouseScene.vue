<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import { PowerhouseScene } from '@/three/powerhouse'
import { usePlantStore } from '@/stores/plant'

const plant = usePlantStore()
const container = ref<HTMLDivElement | null>(null)
let scene: PowerhouseScene | null = null
let ro: ResizeObserver | null = null
const tourOn = ref(false)

const selected = computed(() =>
  plant.units.find((u) => u.id === plant.selectedUnitId) || null
)

function toggleTour() {
  tourOn.value = !tourOn.value
  scene?.setTour(tourOn.value)
}

onMounted(() => {
  if (!container.value) return
  scene = new PowerhouseScene(container.value, (id) => {
    plant.selectUnit(id)
    scene?.focusUnit(id)
  })
  scene.update(plant.units, plant.selectedUnitId)
  ro = new ResizeObserver(() => scene?.resize())
  ro.observe(container.value)
})

// 实时同步机组状态到 3D
watch(
  () => plant.units.map((u) => `${u.mode}:${u.speedRpm.toFixed(0)}`).join('|') + '#' + plant.selectedUnitId,
  () => scene?.update(plant.units, plant.selectedUnitId),
  { flush: 'post' }
)

onBeforeUnmount(() => {
  ro?.disconnect()
  scene?.dispose()
  scene = null
})

function modeText(m: string) {
  return m === 'stopped' ? '停机' : m === 'pumping' ? '抽水' : m === 'generating' ? '发电' : '故障'
}
</script>


<template>
  <div class="ph-wrap">
    <div ref="container" class="ph-canvas" />
    <button class="tour-btn" :class="{ on: tourOn }" @click="toggleTour">
      <span class="tour-icon">{{ tourOn ? '⏸' : '🎬' }}</span>
      {{ tourOn ? '停止巡检' : '自动巡检' }}
    </button>
    <div class="ph-hint">
      <span class="dot" /> 拖动旋转 · 滚轮缩放 · 点击机组查看详情
    </div>

    <transition name="slide">
      <div v-if="selected" class="ph-detail">
        <div class="pd-header">
          <span class="pd-title">{{ selected.name }}</span>
          <span :class="`tag tag-${selected.mode}`">{{ modeText(selected.mode) }}</span>
          <span class="pd-close" @click="plant.selectUnit(null)">×</span>
        </div>
        <div class="pd-grid">
          <div class="pd-item"><label>有功功率</label><b>{{ selected.powerMW.toFixed(0) }}</b><span>MW</span></div>
          <div class="pd-item"><label>流量</label><b>{{ selected.flow.toFixed(1) }}</b><span>m³/s</span></div>
          <div class="pd-item"><label>转速</label><b>{{ selected.speedRpm.toFixed(0) }}</b><span>rpm</span></div>
          <div class="pd-item"><label>导轴承温度</label><b>{{ selected.bearingTemp.toFixed(1) }}</b><span>°C</span></div>
          <div class="pd-item"><label>振动</label><b>{{ selected.vibration.toFixed(2) }}</b><span>mm/s</span></div>
          <div class="pd-item"><label>额定容量</label><b>300</b><span>MW</span></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ph-wrap { position: relative; width: 100%; height: 100%; }
.ph-canvas { width: 100%; height: 100%; }
.ph-hint {
  position: absolute; left: 14px; bottom: 12px;
  font-size: 12px; color: var(--text-secondary);
  display: flex; align-items: center; gap: 6px;
  background: rgba(8,18,32,0.6); padding: 5px 10px; border-radius: 4px;
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-cyan); box-shadow: 0 0 8px var(--accent-cyan); }
.tour-btn {
  position: absolute; right: 14px; bottom: 12px; z-index: 6;
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 12px; letter-spacing: 1px; cursor: pointer;
  color: var(--text-primary); background: rgba(8, 18, 32, 0.78);
  border: 1px solid var(--border-line); border-radius: 5px;
  backdrop-filter: blur(6px); transition: all 0.2s;
}
.tour-btn:hover { border-color: var(--border-line-strong); }
.tour-btn.on {
  color: #061222; font-weight: 600;
  background: linear-gradient(135deg, var(--accent-cyan), #0099ff);
  box-shadow: 0 0 14px rgba(0, 212, 255, 0.5);
}
.tour-icon { font-size: 13px; }
.ph-detail {
  position: absolute; right: 14px; top: 14px; width: 246px;
  background: var(--bg-panel-strong); border: 1px solid var(--border-line-strong);
  border-radius: 6px; box-shadow: var(--shadow-glow); overflow: hidden;
}
.pd-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid var(--border-line);
}
.pd-title { font-size: 14px; font-weight: 600; }
.pd-close { margin-left: auto; cursor: pointer; font-size: 18px; color: var(--text-dim); line-height: 1; }
.pd-close:hover { color: var(--accent-red); }
.pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
.pd-item { display: flex; flex-direction: column; }
.pd-item label { font-size: 11px; color: var(--text-secondary); }
.pd-item b { font-size: 18px; color: var(--accent-cyan); font-variant-numeric: tabular-nums; }
.pd-item span { font-size: 10px; color: var(--text-dim); }
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateX(20px); }
</style>
