<script setup lang="ts">
import { computed } from 'vue'
import { usePlantStore } from '@/stores/plant'
import '@/styles/panel.css'

const plant = usePlantStore()

const upper = computed(() => plant.upperReservoir)
const lower = computed(() => plant.lowerReservoir)

const upperPct = computed(() => Math.max(0, Math.min(100, plant.upperFillPct)))
const lowerPct = computed(() => Math.max(0, Math.min(100, plant.lowerFillPct)))
</script>

<template>
  <section class="panel reservoir-panel">
    <div class="panel-header">
      <span class="panel-title">水库状态</span>
      <span class="metric-label">毛水头 {{ plant.netHeadM.toFixed(1) }} m</span>
    </div>
    <div class="panel-body two-col">
      <div class="res-card up">
        <div class="res-label">上水库 (云台山顶)</div>
        <div class="res-tank">
          <div class="tank-fill up-fill" :style="{ height: upperPct + '%' }">
            <div class="wave" />
            <div class="wave wave2" />
          </div>
          <div class="tank-marks">
            <span>正常 {{ upper.normalLevelM }}</span>
            <span>死水 {{ upper.deadLevelM }}</span>
          </div>
        </div>
        <div class="res-meta">
          <div><span class="metric-label">水位</span><span class="metric-value">{{ upper.levelM.toFixed(1) }}</span><span class="metric-unit">m</span></div>
          <div><span class="metric-label">蓄量</span><span class="metric-value">{{ (upper.volumeM3 / 1e6).toFixed(2) }}</span><span class="metric-unit">百万 m³</span></div>
        </div>
      </div>

      <div class="res-card down">
        <div class="res-label">下水库 (山下)</div>
        <div class="res-tank">
          <div class="tank-fill down-fill" :style="{ height: lowerPct + '%' }">
            <div class="wave" />
            <div class="wave wave2" />
          </div>
          <div class="tank-marks">
            <span>正常 {{ lower.normalLevelM }}</span>
            <span>死水 {{ lower.deadLevelM }}</span>
          </div>
        </div>
        <div class="res-meta">
          <div><span class="metric-label">水位</span><span class="metric-value">{{ lower.levelM.toFixed(1) }}</span><span class="metric-unit">m</span></div>
          <div><span class="metric-label">蓄量</span><span class="metric-value">{{ (lower.volumeM3 / 1e6).toFixed(2) }}</span><span class="metric-unit">百万 m³</span></div>
        </div>
      </div>
    </div>
  </section>
</template>


<style scoped>
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.res-card { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.res-label { font-size: 12px; color: var(--text-secondary); letter-spacing: 1px; }
.res-tank {
  position: relative; width: 80px; height: 110px;
  border: 1px solid var(--border-line-strong);
  border-radius: 4px; overflow: hidden;
  background: rgba(0, 30, 60, 0.4);
}
.tank-fill {
  position: absolute; bottom: 0; left: 0; right: 0;
  transition: height 0.6s ease;
  overflow: hidden;
}
.up-fill { background: linear-gradient(180deg, rgba(0, 255, 136, 0.7), rgba(0, 153, 255, 0.7)); }
.down-fill { background: linear-gradient(180deg, rgba(0, 153, 255, 0.7), rgba(0, 80, 180, 0.85)); }

.wave {
  position: absolute; top: -6px; left: -50%; width: 200%; height: 12px;
  background: radial-gradient(circle at 50% 100%, rgba(255,255,255,0.55) 0%, transparent 60%);
  animation: wave 4s linear infinite;
}
.wave2 { animation-duration: 6s; opacity: 0.5; }
@keyframes wave {
  0% { transform: translateX(0); }
  100% { transform: translateX(50%); }
}
.tank-marks {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 4px 6px; font-size: 9px; color: rgba(255,255,255,0.55);
  pointer-events: none;
}
.res-meta {
  display: flex; flex-direction: column; gap: 4px; align-items: center;
}
.res-meta > div { display: flex; gap: 4px; align-items: baseline; }
</style>
