<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePlantStore } from '@/stores/plant'
import { GRID_LOAD, PRICE, plannedDispatch, tierLabel, tierColor } from '@/data/dispatch'
import { PLANT_INFO } from '@/data/plantConfig'
import { ElSwitch } from 'element-plus'
import '@/styles/panel.css'

echarts.use([
  LineChart, BarChart,
  GridComponent, TooltipComponent, MarkLineComponent, LegendComponent,
  CanvasRenderer
])

const plant = usePlantStore()
const wrap = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const planMW = computed(() =>
  Array.from({ length: 24 }, (_, h) => {
    const p = plannedDispatch(h)
    const mag = p.units * PLANT_INFO.unitCapacityMW
    return p.mode === 'pump' ? -mag : p.mode === 'generate' ? mag : 0
  })
)

function buildOption() {
  return {
    grid: { top: 30, left: 44, right: 44, bottom: 24 },
    legend: {
      top: 2, right: 8, itemWidth: 12, itemHeight: 8,
      textStyle: { color: '#8fa6c4', fontSize: 10 },
      data: ['电网负荷', '电厂出力', '电价']
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(8, 22, 42, 0.92)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e6f1ff', fontSize: 12 }
    },
    xAxis: {
      type: 'category' as const,
      data: hours,
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
      axisLabel: { color: '#5a6e8a', fontSize: 9, interval: 2 }
    },
    yAxis: [
      {
        type: 'value' as const, name: 'MW', min: -1300, max: 1300,
        nameTextStyle: { color: '#5a6e8a', fontSize: 9 },
        axisLine: { show: false },
        axisLabel: { color: '#5a6e8a', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } }
      },
      {
        type: 'value' as const, name: '元', min: 0, max: 1.5,
        nameTextStyle: { color: '#5a6e8a', fontSize: 9 },
        axisLine: { show: false },
        axisLabel: { color: '#5a6e8a', fontSize: 9 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '电网负荷', type: 'line' as const, smooth: true, symbol: 'none',
        data: GRID_LOAD.map((v) => +(v * 1200).toFixed(0)),
        lineStyle: { color: '#a78bfa', width: 1.5, type: 'dashed' as const },
        z: 2
      },
      {
        name: '电厂出力', type: 'bar' as const,
        data: planMW.value.map((v) => ({
          value: v,
          itemStyle: { color: v < 0 ? '#ff9d00' : v > 0 ? '#00ff88' : '#3a4a60' }
        })),
        barWidth: '55%',
        markLine: {
          symbol: 'none', silent: true,
          lineStyle: { color: '#00d4ff', width: 2 },
          data: [{ xAxis: plant.currentHour, label: { show: false } }]
        },
        z: 1
      },
      {
        name: '电价', type: 'line' as const, smooth: false, step: 'middle' as const,
        yAxisIndex: 1, symbol: 'none',
        data: PRICE,
        lineStyle: { color: '#ffce5c', width: 1.5 },
        z: 3
      }
    ]
  }
}

onMounted(() => {
  if (!wrap.value) return
  chart = echarts.init(wrap.value)
  chart.setOption(buildOption())
  const ro = new ResizeObserver(() => chart?.resize())
  ro.observe(wrap.value)
  ;(wrap.value as any)._ro = ro
})
onBeforeUnmount(() => {
  ;(wrap.value as any)?._ro?.disconnect()
  chart?.dispose()
})
watch(() => plant.currentHour, () => chart?.setOption(buildOption()))

const clockText = computed(() => {
  const h = Math.floor(plant.simHour)
  const m = Math.floor((plant.simHour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})
const revenueText = computed(() => {
  const v = plant.revenue
  return v >= 10000 ? (v / 10000).toFixed(2) + ' 万元'
    : v <= -10000 ? (v / 10000).toFixed(2) + ' 万元'
    : v.toFixed(0) + ' 元'
})
</script>

<template>
  <section class="panel dispatch-panel">
    <div class="panel-header">
      <span class="panel-title">日内调度 · 削峰填谷</span>
      <div class="dp-auto">
        <span class="metric-label">自动调度</span>
        <ElSwitch
          :model-value="plant.autoDispatch"
          size="small"
          @update:model-value="(v: any) => plant.setAutoDispatch(!!v)"
        />
      </div>
    </div>
    <div class="dp-status">
      <div class="dp-clock">
        <span class="dp-clock-icon">🕐</span>{{ clockText }}
      </div>
      <div class="dp-tier" :style="{ color: tierColor(plant.currentTier) }">
        {{ tierLabel(plant.currentTier) }}时段 · {{ plant.currentPrice.toFixed(2) }} 元/kWh
      </div>
      <div class="dp-rev" :class="{ neg: plant.revenue < 0 }">
        套利 {{ revenueText }}
      </div>
    </div>
    <div ref="wrap" class="dp-chart" />
  </section>
</template>

<style scoped>
.dispatch-panel { display: flex; flex-direction: column; }
.dp-auto { display: flex; align-items: center; gap: 8px; }
.dp-status {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 14px; border-bottom: 1px solid var(--border-line);
}
.dp-clock {
  font-size: 16px; font-weight: 700; color: var(--accent-cyan);
  font-variant-numeric: tabular-nums; display: flex; align-items: center; gap: 4px;
}
.dp-clock-icon { font-size: 13px; }
.dp-tier { font-size: 12px; font-weight: 600; }
.dp-rev {
  margin-left: auto; font-size: 13px; font-weight: 600; color: var(--accent-green);
  font-variant-numeric: tabular-nums;
}
.dp-rev.neg { color: var(--accent-orange); }
.dp-chart { width: 100%; height: 170px; }
</style>
