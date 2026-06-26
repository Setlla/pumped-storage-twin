<script setup lang="ts">
import { computed } from 'vue'
import { usePlantStore } from '@/stores/plant'
import { PLANT_INFO } from '@/data/plantConfig'
import { ElButton } from 'element-plus'
import '@/styles/panel.css'

const plant = usePlantStore()

function modeText(m: string) {
  return m === 'stopped' ? '停机'
    : m === 'pumping' ? '抽水'
    : m === 'generating' ? '发电'
    : '故障'
}
function modeTagClass(m: string) {
  return `tag tag-${m}`
}
function powerPct(p: number) {
  return Math.min(100, (Math.abs(p) / PLANT_INFO.unitCapacityMW) * 100)
}
const aggregatePower = computed(() => plant.totalPowerMW.toFixed(0))
</script>

<template>
  <section class="panel unit-panel">
    <div class="panel-header">
      <span class="panel-title">机组状态 (4×{{ PLANT_INFO.unitCapacityMW }} MW)</span>
      <span class="metric-label">合计 {{ aggregatePower }} MW</span>
    </div>
    <div class="panel-body unit-grid">
      <div
        v-for="u in plant.units"
        :key="u.id"
        class="unit-card"
        :class="{ alarm: u.hasAlarm }"
      >
        <div class="uc-row">
          <span class="uc-name">{{ u.name }}</span>
          <span :class="modeTagClass(u.mode)">{{ modeText(u.mode) }}</span>
        </div>
        <div class="bar">
          <div
            class="bar-fill"
            :class="u.mode"
            :style="{ width: powerPct(u.powerMW) + '%' }"
          />
        </div>
        <div class="uc-metrics">
          <div><span class="metric-label">P</span><span class="metric-value">{{ u.powerMW.toFixed(0) }}</span><span class="metric-unit">MW</span></div>
          <div><span class="metric-label">Q</span><span class="metric-value">{{ u.flow.toFixed(1) }}</span><span class="metric-unit">m³/s</span></div>
          <div><span class="metric-label">n</span><span class="metric-value">{{ u.speedRpm.toFixed(0) }}</span><span class="metric-unit">rpm</span></div>
          <div><span class="metric-label">T</span><span class="metric-value">{{ u.bearingTemp.toFixed(1) }}</span><span class="metric-unit">°C</span></div>
        </div>
        <div class="uc-actions">
          <ElButton
            v-if="!u.hasAlarm"
            size="small"
            :type="u.mode === 'stopped' ? 'primary' : 'default'"
            plain
            @click="plant.toggleUnit(u.id)"
          >
            {{ u.mode === 'stopped' ? '启动' : '停机' }}
          </ElButton>
          <ElButton
            v-if="!u.hasAlarm"
            size="small"
            type="danger"
            plain
            @click="plant.injectFault(u.id)"
          >
            注入故障
          </ElButton>
          <ElButton
            v-else
            size="small"
            type="warning"
            @click="plant.clearFault(u.id)"
          >
            复位
          </ElButton>
        </div>
      </div>
    </div>
  </section>
</template>


<style scoped>
.unit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.unit-card {
  background: rgba(0, 30, 60, 0.35);
  border: 1px solid var(--border-line);
  border-radius: 4px;
  padding: 8px;
  display: flex; flex-direction: column; gap: 6px;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.unit-card:hover {
  border-color: var(--border-line-strong);
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.25);
}
.unit-card.alarm {
  border-color: var(--accent-red);
  box-shadow: 0 0 12px rgba(255, 56, 96, 0.4);
}
.uc-row { display: flex; justify-content: space-between; align-items: center; }
.uc-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.bar {
  height: 4px; background: rgba(255, 255, 255, 0.06);
  border-radius: 2px; overflow: hidden;
}
.bar-fill {
  height: 100%; transition: width 0.4s ease, background 0.3s;
  background: var(--text-dim);
}
.bar-fill.generating { background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan)); }
.bar-fill.pumping { background: linear-gradient(90deg, var(--accent-orange), #ff5c00); }
.bar-fill.fault { background: var(--accent-red); }
.bar-fill.stopped { background: var(--text-dim); }
.uc-metrics {
  display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px;
}
.uc-metrics > div {
  display: flex; gap: 4px; align-items: baseline;
}
.uc-metrics .metric-value { font-size: 13px; }
.uc-actions { display: flex; gap: 6px; margin-top: 2px; }
:deep(.uc-actions .el-button) { flex: 1; }
</style>
