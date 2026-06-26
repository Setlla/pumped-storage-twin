<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePlantStore } from '@/stores/plant'
import '@/styles/panel.css'

echarts.use([LineChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer])

const plant = usePlantStore()
const wrap = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function buildOption() {
  const data = plant.powerHistory.map((p) => [p.ts, +p.mw.toFixed(2)])
  return {
    grid: { top: 16, left: 44, right: 12, bottom: 24 },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(8, 22, 42, 0.92)',
      borderColor: 'rgba(0, 212, 255, 0.3)',
      textStyle: { color: '#e6f1ff', fontSize: 12 },
      formatter: (params: any) => {
        const p = params[0]
        const t = new Date(p.value[0])
        const hh = String(t.getHours()).padStart(2, '0')
        const mm = String(t.getMinutes()).padStart(2, '0')
        const ss = String(t.getSeconds()).padStart(2, '0')
        return `${hh}:${mm}:${ss}<br/>总出力 ${p.value[1]} MW`
      }
    },
    xAxis: {
      type: 'time' as const,
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
      axisLabel: { color: '#5a6e8a', fontSize: 10, hideOverlap: true }
    },
    yAxis: {
      type: 'value' as const,
      min: -1300,
      max: 1300,
      axisLine: { show: false },
      axisLabel: { color: '#5a6e8a', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0,212,255,0.08)' } }
    },
    series: [{
      type: 'line' as const,
      smooth: true,
      symbol: 'none',
      data,
      lineStyle: { color: '#00d4ff', width: 2 },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0,212,255,0.5)' },
            { offset: 1, color: 'rgba(0,212,255,0)' }
          ]
        }
      },
      markLine: {
        symbol: 'none',
        lineStyle: { color: 'rgba(255,255,255,0.2)', type: 'dashed' as const },
        data: [{ yAxis: 0 }]
      }
    }]
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
watch(
  () => plant.powerHistory.length,
  () => chart?.setOption(buildOption())
)
</script>

<template>
  <section class="panel curve-panel">
    <div class="panel-header">
      <span class="panel-title">出力曲线 (近 4 分钟)</span>
      <span class="metric-label">
        发电
        <span style="color: var(--accent-green)">+</span>
        / 抽水
        <span style="color: var(--accent-orange)">−</span>
      </span>
    </div>
    <div ref="wrap" class="chart-canvas" />
  </section>
</template>

<style scoped>
.curve-panel { display: flex; flex-direction: column; }
.chart-canvas { width: 100%; height: 150px; }
</style>
