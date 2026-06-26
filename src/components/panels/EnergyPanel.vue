<script setup lang="ts">
import { computed } from 'vue'
import { usePlantStore } from '@/stores/plant'
import '@/styles/panel.css'

const plant = usePlantStore()

const gen = computed(() => plant.energyGenerated)
const pump = computed(() => plant.energyPumped)
const eff = computed(() => plant.designEfficiency)
const recovery = computed(() => plant.actualRecovery)

// 效率环形进度 (典型抽蓄综合效率 ~76%)
const effDash = computed(() => {
  const c = 2 * Math.PI * 26
  const p = Math.max(0, Math.min(100, eff.value)) / 100
  return `${(c * p).toFixed(1)} ${c.toFixed(1)}`
})
const effColor = computed(() =>
  eff.value >= 70 ? '#00ff88' : eff.value >= 50 ? '#ff9d00' : '#ff3860'
)
function fmt(x: number) {
  return x >= 1000 ? (x / 1000).toFixed(2) + 'k' : x.toFixed(1)
}
</script>

<template>
  <section class="panel energy-panel">
    <div class="panel-header">
      <span class="panel-title">能量与效率</span>
      <span class="metric-label">累计统计</span>
    </div>
    <div class="panel-body energy-body">
      <div class="eff-ring">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6" />
          <circle
            cx="32" cy="32" r="26" fill="none" :stroke="effColor" stroke-width="6"
            stroke-linecap="round" :stroke-dasharray="effDash"
            transform="rotate(-90 32 32)" style="transition: stroke-dasharray 0.6s"
          />
        </svg>
        <div class="eff-text">
          <b :style="{ color: effColor }">{{ eff.toFixed(0) }}<small>%</small></b>
          <span>设计综合效率</span>
        </div>
      </div>
      <div class="energy-stats">
        <div class="es-row gen">
          <span class="es-dot" /><span class="es-label">累计发电</span>
          <span class="es-val">{{ fmt(gen) }}<small>MWh</small></span>
        </div>
        <div class="es-row pump">
          <span class="es-dot" /><span class="es-label">抽水耗电</span>
          <span class="es-val">{{ fmt(pump) }}<small>MWh</small></span>
        </div>
        <div class="es-row net">
          <span class="es-dot" /><span class="es-label">实际回收率</span>
          <span class="es-val">{{ recovery.toFixed(1) }}<small>%</small></span>
        </div>
      </div>
    </div>
  </section>
</template>


<style scoped>
.energy-body { display: flex; align-items: center; gap: 16px; }
.eff-ring { position: relative; width: 88px; height: 88px; flex-shrink: 0; }
.eff-ring svg { width: 100%; height: 100%; }
.eff-text {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.eff-text b { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.eff-text b small { font-size: 11px; margin-left: 1px; }
.eff-text span { font-size: 10px; color: var(--text-secondary); margin-top: 1px; }

.energy-stats { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.es-row {
  display: grid; grid-template-columns: 10px 1fr auto; gap: 8px; align-items: center;
}
.es-dot { width: 8px; height: 8px; border-radius: 50%; }
.es-row.gen .es-dot { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
.es-row.pump .es-dot { background: var(--accent-orange); box-shadow: 0 0 6px var(--accent-orange); }
.es-row.net .es-dot { background: var(--accent-cyan); box-shadow: 0 0 6px var(--accent-cyan); }
.es-label { font-size: 12px; color: var(--text-secondary); }
.es-val { font-size: 15px; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.es-val small { font-size: 10px; color: var(--text-dim); margin-left: 2px; font-weight: 400; }
</style>
