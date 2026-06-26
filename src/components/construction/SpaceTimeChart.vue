<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useConstructionStore } from '@/stores/construction'
import { monthLabel } from '@/data/construction'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer])

const c = useConstructionStore()
const wrap = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const months = computed(() => c.series.map((p) => monthLabel(p.month)))

function buildOption() {
  const s = c.series
  return {
    title: {
      text: '土石方时空平衡 · 逐月开挖/填筑与累计堆存',
      textStyle: { color: '#e6f1ff', fontSize: 13, fontWeight: 600 },
      left: 14, top: 8
    },
    grid: { top: 64, left: 52, right: 52, bottom: 40 },
    legend: {
      top: 32, right: 12, itemWidth: 14, itemHeight: 8,
      textStyle: { color: '#8fa6c4', fontSize: 11 },
      data: ['当月开挖(可利用)', '当月填筑需求', '累计可利用开挖', '累计填筑', '累计堆存']
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8,22,42,0.94)', borderColor: 'rgba(0,212,255,0.3)',
      textStyle: { color: '#e6f1ff', fontSize: 12 }
    },
    xAxis: {
      type: 'category', data: months.value, boundaryGap: true,
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
      axisLabel: { color: '#5a6e8a', fontSize: 10, interval: 11 }
    },
    yAxis: [
      {
        type: 'value', name: '月强度 万m³', min: 0,
        nameTextStyle: { color: '#5a6e8a', fontSize: 10 },
        axisLabel: { color: '#5a6e8a', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } }
      },
      {
        type: 'value', name: '累计 万m³', min: 0,
        nameTextStyle: { color: '#5a6e8a', fontSize: 10 },
        axisLabel: { color: '#5a6e8a', fontSize: 10 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '当月开挖(可利用)', type: 'bar', data: s.map((p) => +p.cut.toFixed(1)),
        itemStyle: { color: 'rgba(255,157,0,0.7)' }, barWidth: '38%', stack: 'a'
      },
      {
        name: '当月填筑需求', type: 'bar', data: s.map((p) => +p.fill.toFixed(1)),
        itemStyle: { color: 'rgba(0,212,255,0.7)' }, barWidth: '38%'
      },
      {
        name: '累计可利用开挖', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none',
        data: s.map((p) => +p.cumCut.toFixed(0)), lineStyle: { color: '#ff9d00', width: 2 }
      },
      {
        name: '累计填筑', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none',
        data: s.map((p) => +p.cumFill.toFixed(0)), lineStyle: { color: '#00d4ff', width: 2 }
      },
      {
        name: '累计堆存', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'none',
        data: s.map((p) => +p.stock.toFixed(0)),
        lineStyle: { color: '#a78bfa', width: 2.5 },
        areaStyle: { color: 'rgba(167,139,250,0.18)' },
        markLine: {
          symbol: 'none', silent: true,
          lineStyle: { color: '#00ff88', width: 2 },
          data: [{ xAxis: Math.max(0, Math.round(c.currentMonth) - 1), label: { show: false } }]
        }
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
watch(() => Math.round(c.currentMonth), () => chart?.setOption(buildOption()))
</script>

<template>
  <div class="stc-wrap">
    <div ref="wrap" class="stc-chart" />
    <div class="stc-note">
      绿线＝当前时刻。紫色"累计堆存"＝可利用开挖超前于填筑需求而临时堆存的方量，
      体现开挖与填筑在<b>时间上的错配</b>——这正是"时空平衡"的核心。
    </div>
  </div>
</template>

<style scoped>
.stc-wrap {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  background: radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.05), transparent 60%), #061222;
}
.stc-chart { flex: 1; min-height: 0; }
.stc-note {
  font-size: 12px; color: var(--text-secondary); line-height: 1.6;
  padding: 8px 16px 14px; border-top: 1px solid var(--border-line);
}
.stc-note b { color: var(--accent-green); }
</style>
