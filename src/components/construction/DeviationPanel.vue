<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useConstructionStore } from '@/stores/construction'
import { computeDeviation } from '@/logic/deviation'
import '@/styles/panel.css'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer])

const c = useConstructionStore()
const dev = computed(() => computeDeviation(c.cutZones, c.fillZones, c.currentMonth))

function devCls(v: number) { return v > 0 ? 'pos' : v < 0 ? 'neg' : '' }
function statusText(s: string) { return s === 'ok' ? '正常' : s === 'warn' ? '关注' : '偏差大' }

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
function shortName(n: string) { return n.replace(/开挖|填筑|工程/g, '').slice(0, 6) }
function buildOption() {
  const rows = dev.value.rows
  return {
    grid: { top: 36, left: 46, right: 46, bottom: 56 },
    legend: { top: 4, textStyle: { color: '#8fa6c4', fontSize: 11 }, data: ['设计量', '实测量', '进度偏差(月)'] },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(8,22,42,0.94)', borderColor: 'rgba(0,212,255,0.3)', textStyle: { color: '#e6f1ff', fontSize: 12 } },
    xAxis: { type: 'category', data: rows.map((r) => shortName(r.name)), axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } }, axisLabel: { color: '#5a6e8a', fontSize: 10, interval: 0, rotate: 30 } },
    yAxis: [
      { type: 'value', name: '万m³', nameTextStyle: { color: '#5a6e8a', fontSize: 9 }, axisLabel: { color: '#5a6e8a', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } } },
      { type: 'value', name: '偏差(月)', nameTextStyle: { color: '#5a6e8a', fontSize: 9 }, axisLabel: { color: '#5a6e8a', fontSize: 9 }, splitLine: { show: false } }
    ],
    series: [
      { name: '设计量', type: 'bar', data: rows.map((r) => r.designM3), itemStyle: { color: 'rgba(95,110,140,0.8)' }, barWidth: '32%' },
      { name: '实测量', type: 'bar', data: rows.map((r) => r.actualM3), itemStyle: { color: 'rgba(0,212,255,0.8)' }, barWidth: '32%' },
      { name: '进度偏差(月)', type: 'line', yAxisIndex: 1, symbol: 'circle', symbolSize: 7,
        data: rows.map((r) => r.progDevMonth),
        itemStyle: { color: '#ff9d00' }, lineStyle: { color: '#ff9d00', width: 2 },
        markLine: { symbol: 'none', silent: true, lineStyle: { color: 'rgba(255,255,255,0.2)', type: 'dashed' }, data: [{ yAxis: 0 }] } }
    ]
  }
}
onMounted(() => { if (chartEl.value) { chart = echarts.init(chartEl.value); chart.setOption(buildOption()); const ro = new ResizeObserver(() => chart?.resize()); ro.observe(chartEl.value); (chartEl.value as any)._ro = ro } })
onBeforeUnmount(() => { (chartEl.value as any)?._ro?.disconnect(); chart?.dispose() })
watch([dev, () => c.currentMonth], () => chart?.setOption(buildOption()))
</script>

<template>
  <div class="dev-wrap">
    <div class="kpis">
      <div class="kpi"><div class="kv">{{ dev.totalDesign.toFixed(0) }}<small>万m³</small></div><div class="kl">设计总量</div></div>
      <div class="kpi"><div class="kv">{{ dev.totalActual.toFixed(0) }}<small>万m³</small></div><div class="kl">实测总量</div></div>
      <div class="kpi"><div class="kv" :class="devCls(dev.totalVolDevPct)">{{ dev.totalVolDevPct > 0 ? '+' : '' }}{{ dev.totalVolDevPct }}<small>%</small></div><div class="kl">总量偏差</div></div>
      <div class="kpi"><div class="kv" :class="dev.avgProgDevMonth < 0 ? 'neg' : 'pos'">{{ dev.avgProgDevMonth }}<small>月</small></div><div class="kl">平均进度偏差</div></div>
      <div class="kpi"><div class="kv warn">{{ dev.laggingCount }}</div><div class="kl">滞后工区数</div></div>
    </div>

    <section class="panel chart-panel">
      <div class="panel-header"><span class="panel-title">设计 vs 实测 对比 · 进度偏差</span></div>
      <div ref="chartEl" class="dev-chart" />
    </section>

    <section class="panel tbl-panel">
      <div class="panel-header">
        <span class="panel-title">设计 vs 实测 偏差分析</span>
        <span class="metric-label">数据源：{{ c.dataSource }} · 截至 {{ c.monthText }}</span>
      </div>
      <div class="tbl-scroll">
        <table>
          <thead>
            <tr><th>工区</th><th>类型</th><th>设计量<small>万m³</small></th><th>实测量<small>万m³</small></th><th>量偏差</th><th>设计进度</th><th>实际进度</th><th>进度偏差</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in dev.rows" :key="r.id">
              <td>{{ r.name }}</td>
              <td><span class="tag" :class="r.kind === '开挖' ? 't-cut' : 't-fill'">{{ r.kind }}</span></td>
              <td class="num">{{ r.designM3 }}</td>
              <td class="num">{{ r.actualM3 }}</td>
              <td class="num" :class="devCls(r.volDevPct)">{{ r.volDevPct > 0 ? '+' : '' }}{{ r.volDevPct }}%</td>
              <td class="num">{{ (r.designProgress * 100).toFixed(0) }}%</td>
              <td class="num">{{ (r.actualProgress * 100).toFixed(0) }}%</td>
              <td class="num" :class="r.progDevMonth < 0 ? 'neg' : 'pos'">{{ r.progDevMonth > 0 ? '+' : '' }}{{ r.progDevMonth }} 月</td>
              <td><span class="st" :class="r.status">{{ statusText(r.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="dev-note">
        说明：当前"实测"为基于设计的合理推演（确定性扰动，演示用）；接入<b>无人机测量 / 称重运输 / 现场揭露</b>数据后，此处即为真实设计-实测对比。
      </div>
    </section>
  </div>
</template>

<style scoped>
.dev-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #061222; overflow: auto; }
.chart-panel { flex-shrink: 0; }
.dev-chart { height: 240px; padding: 4px; }
.kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; flex-shrink: 0; }
.kpi { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 10px 12px; text-align: center; }
.kv { font-size: 22px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.kv small { font-size: 11px; color: var(--text-dim); margin-left: 2px; font-weight: 400; }
.kv.pos { color: var(--accent-green); }
.kv.neg { color: var(--accent-red); }
.kv.warn { color: var(--accent-orange); }
.kl { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
.panel { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.tbl-scroll { overflow: auto; flex: 1; padding: 0 4px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { position: sticky; top: 0; background: var(--bg-panel-strong); color: var(--text-secondary); font-weight: 500; text-align: left; padding: 8px; border-bottom: 1px solid var(--border-line); white-space: nowrap; }
thead th small { color: var(--text-dim); font-weight: 400; margin-left: 2px; }
tbody td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
tbody td.pos { color: var(--accent-green); }
tbody td.neg { color: var(--accent-red); }
tbody tr:hover { background: rgba(0,212,255,0.05); }
.tag { font-size: 10px; padding: 1px 7px; border-radius: 3px; }
.t-cut { background: rgba(255,157,0,0.16); color: var(--accent-orange); }
.t-fill { background: rgba(0,212,255,0.16); color: var(--accent-cyan); }
.st { font-size: 10px; padding: 1px 7px; border-radius: 3px; }
.st.ok { background: rgba(0,255,136,0.16); color: var(--accent-green); }
.st.warn { background: rgba(255,157,0,0.16); color: var(--accent-orange); }
.st.crit { background: rgba(255,56,96,0.16); color: var(--accent-red); }
.dev-note { font-size: 11px; color: var(--text-secondary); padding: 8px 12px; border-top: 1px solid var(--border-line); line-height: 1.5; }
.dev-note b { color: var(--accent-cyan); }
</style>
