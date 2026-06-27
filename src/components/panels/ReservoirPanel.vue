<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-liquidfill'
import { usePlantStore } from '@/stores/plant'
import '@/styles/panel.css'

const plant = usePlantStore()
const upper = computed(() => plant.upperReservoir)
const lower = computed(() => plant.lowerReservoir)
const upperPct = computed(() => Math.max(0, Math.min(100, plant.upperFillPct)))
const lowerPct = computed(() => Math.max(0, Math.min(100, plant.lowerFillPct)))

const upEl = ref<HTMLDivElement | null>(null)
const lowEl = ref<HTMLDivElement | null>(null)
let upChart: echarts.ECharts | null = null
let lowChart: echarts.ECharts | null = null

function liquidOption(frac: number, color: string) {
  return {
    series: [{
      type: 'liquidFill',
      radius: '92%',
      data: [frac, frac - 0.06, frac - 0.12],
      color: [color],
      backgroundStyle: { color: 'rgba(0,30,60,0.35)', borderColor: color, borderWidth: 1.5 },
      outline: { show: true, borderDistance: 2, itemStyle: { borderColor: color, borderWidth: 2, shadowBlur: 8, shadowColor: color } },
      amplitude: 6,
      waveLength: '80%',
      label: {
        formatter: () => (frac * 100).toFixed(0) + '%',
        fontSize: 20, fontWeight: 'bold', color: '#fff'
      }
    }]
  }
}

onMounted(() => {
  if (upEl.value) { upChart = echarts.init(upEl.value); upChart.setOption(liquidOption(upperPct.value / 100, '#16b6ff')) }
  if (lowEl.value) { lowChart = echarts.init(lowEl.value); lowChart.setOption(liquidOption(lowerPct.value / 100, '#1184e0')) }
})
watch(upperPct, (v) => upChart?.setOption(liquidOption(v / 100, '#16b6ff')))
watch(lowerPct, (v) => lowChart?.setOption(liquidOption(v / 100, '#1184e0')))
onBeforeUnmount(() => { upChart?.dispose(); lowChart?.dispose() })
</script>

<template>
  <section class="panel reservoir-panel">
    <div class="panel-header">
      <span class="panel-title">水库状态</span>
      <span class="metric-label">毛水头 {{ plant.netHeadM.toFixed(1) }} m</span>
    </div>
    <div class="panel-body two-col">
      <div class="res-card">
        <div class="res-label">上水库 · 云台山顶</div>
        <div ref="upEl" class="liquid" />
        <div class="res-meta">
          <div><span class="metric-label">水位</span><span class="metric-value">{{ upper.levelM.toFixed(1) }}</span><span class="metric-unit">m</span></div>
          <div><span class="metric-label">蓄量</span><span class="metric-value">{{ (upper.volumeM3 / 1e6).toFixed(2) }}</span><span class="metric-unit">百万m³</span></div>
        </div>
      </div>
      <div class="res-card">
        <div class="res-label">下水库 · 山下</div>
        <div ref="lowEl" class="liquid" />
        <div class="res-meta">
          <div><span class="metric-label">水位</span><span class="metric-value">{{ lower.levelM.toFixed(1) }}</span><span class="metric-unit">m</span></div>
          <div><span class="metric-label">蓄量</span><span class="metric-value">{{ (lower.volumeM3 / 1e6).toFixed(2) }}</span><span class="metric-unit">百万m³</span></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.res-card { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.res-label { font-size: 12px; color: var(--text-secondary); letter-spacing: 1px; }
.liquid { width: 108px; height: 108px; }
.res-meta { display: flex; flex-direction: column; gap: 4px; align-items: center; }
.res-meta > div { display: flex; gap: 4px; align-items: baseline; }
</style>
