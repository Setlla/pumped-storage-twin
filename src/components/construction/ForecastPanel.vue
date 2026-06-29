<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useConstructionStore } from '@/stores/construction'
import { computeForecast } from '@/logic/forecast'
import { buildMonthlySeries, monthLabel, STOCKPILE, zoneProgressAt } from '@/data/construction'
import { ElSelect, ElOption, ElSlider } from 'element-plus'
import '@/styles/panel.css'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent, CanvasRenderer])

const c = useConstructionStore()
const fc = computed(() => computeForecast(c.series, c.currentMonth))
function stText(s: string) { return s === 'ok' ? '正常' : s === 'warn' ? '关注' : '超限' }

// ---- What-if 推演 ----
const zoneOptions = computed(() => [
  ...c.cutZones.map((z) => ({ id: z.id, name: '挖·' + z.name })),
  ...c.fillZones.map((z) => ({ id: z.id, name: '填·' + z.name }))
])
const wfZone = ref<string>('')
const wfStartShift = ref(0) // 开工提前(-)/推迟(+) 月
const wfDurFactor = ref(100) // 工期 %
onMounted(() => { wfZone.value = c.fillZones.find((z) => z.id === 'upperDam')?.id || c.cutZones[0]?.id || '' })

const whatIfSeries = computed(() => {
  const cut = c.cutZones.map((z) => ({ ...z }))
  const fill = c.fillZones.map((z) => ({ ...z }))
  const apply = (z: any) => {
    if (z.id === wfZone.value) {
      z.startMonth = Math.max(0, z.startMonth + wfStartShift.value)
      z.durMonth = Math.max(3, Math.round(z.durMonth * wfDurFactor.value / 100))
    }
  }
  cut.forEach(apply); fill.forEach(apply)
  return buildMonthlySeries(cut, fill)
})

const peakBase = computed(() => Math.max(...c.series.map((p) => p.stock)))
const peakWhatIf = computed(() => Math.max(...whatIfSeries.value.map((p) => p.stock)))
const changed = computed(() => wfStartShift.value !== 0 || wfDurFactor.value !== 100)

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
function option() {
  const months = c.series.map((p) => monthLabel(p.month))
  return {
    grid: { top: 30, left: 48, right: 16, bottom: 28 },
    legend: { top: 2, right: 8, textStyle: { color: '#8fa6c4', fontSize: 11 }, data: ['计划堆存', '推演堆存', '中转场容量'] },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(8,22,42,0.94)', borderColor: 'rgba(0,212,255,0.3)', textStyle: { color: '#e6f1ff', fontSize: 12 } },
    xAxis: { type: 'category', data: months, axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } }, axisLabel: { color: '#5a6e8a', fontSize: 9, interval: 11 } },
    yAxis: { type: 'value', name: '堆存 万m³', nameTextStyle: { color: '#5a6e8a', fontSize: 9 }, axisLabel: { color: '#5a6e8a', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } } },
    series: [
      { name: '计划堆存', type: 'line', smooth: true, symbol: 'none', data: c.series.map((p) => +p.stock.toFixed(0)), lineStyle: { color: '#a78bfa', width: 2 }, areaStyle: { color: 'rgba(167,139,250,0.12)' } },
      { name: '推演堆存', type: 'line', smooth: true, symbol: 'none', data: whatIfSeries.value.map((p) => +p.stock.toFixed(0)), lineStyle: { color: '#00ff88', width: 2, type: changed.value ? 'solid' : 'dashed' } },
      { name: '中转场容量', type: 'line', symbol: 'none', data: c.series.map(() => STOCKPILE.capacityM3), lineStyle: { color: '#ff3860', width: 1.5, type: 'dashed' },
        markArea: { silent: true, itemStyle: { color: 'rgba(255,56,96,0.06)' }, data: [[{ yAxis: STOCKPILE.capacityM3 }, { yAxis: 9999 }]] } }
    ]
  }
}
onMounted(() => { if (chartEl.value) { chart = echarts.init(chartEl.value); chart.setOption(option()); const ro = new ResizeObserver(() => chart?.resize()); ro.observe(chartEl.value); (chartEl.value as any)._ro = ro } })
onBeforeUnmount(() => { (chartEl.value as any)?._ro?.disconnect(); chart?.dispose() })
watch([whatIfSeries, () => c.currentMonth], () => chart?.setOption(option()))
function resetWf() { wfStartShift.value = 0; wfDurFactor.value = 100 }
</script>


<template>
  <div class="fc-wrap">
    <div class="kpis">
      <div class="kpi"><div class="kv">{{ c.monthText }}</div><div class="kl">当前时点</div></div>
      <div class="kpi"><div class="kv warn">{{ fc.peakStock }}<small>万m³</small></div><div class="kl">计划堆存峰值</div></div>
      <div class="kpi"><div class="kv" :class="peakWhatIf < peakBase ? 'okc' : peakWhatIf > peakBase ? 'crit' : ''">{{ peakWhatIf.toFixed(0) }}<small>万m³</small></div><div class="kl">推演堆存峰值</div></div>
      <div class="kpi"><div class="kv" :class="fc.risks.some(r => r.level==='critical') ? 'crit' : 'okc'">{{ fc.risks.filter(r => r.level==='critical').length }}</div><div class="kl">严重风险点</div></div>
    </div>

    <div class="mid">
      <!-- What-if 推演 -->
      <section class="panel wf-panel">
        <div class="panel-header"><span class="panel-title">进度沙盘推演 (What-if)</span><button class="mini" @click="resetWf">重置</button></div>
        <div class="wf-body">
          <div class="wf-row"><label>调整工区</label>
            <ElSelect v-model="wfZone" size="small" style="width:100%">
              <ElOption v-for="z in zoneOptions" :key="z.id" :label="z.name" :value="z.id" />
            </ElSelect>
          </div>
          <div class="wf-row"><label>开工 {{ wfStartShift > 0 ? '推迟' : wfStartShift < 0 ? '提前' : '' }} {{ Math.abs(wfStartShift) }} 月</label>
            <ElSlider v-model="wfStartShift" :min="-12" :max="12" :step="1" />
          </div>
          <div class="wf-row"><label>工期 {{ wfDurFactor }}%</label>
            <ElSlider v-model="wfDurFactor" :min="50" :max="150" :step="5" />
          </div>
          <div class="wf-result" :class="peakWhatIf < peakBase ? 'good' : peakWhatIf > peakBase ? 'bad' : ''">
            <template v-if="changed">堆存峰值 {{ peakBase.toFixed(0) }} → <b>{{ peakWhatIf.toFixed(0) }}</b> 万m³
              ({{ peakWhatIf < peakBase ? '↓ 缓解' : peakWhatIf > peakBase ? '↑ 加剧' : '持平' }})</template>
            <template v-else>拖动滑杆推演开工/工期调整对中转堆存的影响</template>
          </div>
        </div>
      </section>
      <!-- 预测曲线 -->
      <section class="panel chart-panel">
        <div class="panel-header"><span class="panel-title">中转堆存轨迹预测 vs 容量</span></div>
        <div ref="chartEl" class="fc-chart" />
      </section>
    </div>

    <section class="panel risk-panel">
      <div class="panel-header"><span class="panel-title">未来时空缺口预判</span><span class="metric-label">滚动预测 · 截至 {{ c.monthText }}</span></div>
      <div class="risk-list">
        <div v-for="(r, i) in fc.risks" :key="i" class="risk" :class="r.level">
          <span class="rl">{{ r.level === 'critical' ? '严重' : '提示' }}</span>
          <div class="rmain">
            <div class="rtop"><b>{{ r.type }}</b><span class="rm">{{ monthLabel(r.month) }} · {{ r.value }}</span></div>
            <div class="rsg">建议:{{ r.suggest }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fc-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #061222; overflow: auto; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex-shrink: 0; }
.kpi { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 10px 12px; text-align: center; }
.kv { font-size: 20px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.kv small { font-size: 11px; color: var(--text-dim); margin-left: 2px; font-weight: 400; }
.kv.warn { color: var(--accent-orange); } .kv.crit { color: var(--accent-red); } .kv.okc { color: var(--accent-green); }
.kl { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
.mid { display: grid; grid-template-columns: 300px 1fr; gap: 10px; }
.panel { display: flex; flex-direction: column; }
.mini { font-size: 11px; padding: 3px 10px; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.wf-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; }
.wf-row label { font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px; }
.wf-result { font-size: 12px; color: var(--text-secondary); padding: 8px 10px; border-radius: 5px; background: rgba(0,30,60,0.3); line-height: 1.5; }
.wf-result b { font-size: 15px; }
.wf-result.good { color: var(--accent-green); } .wf-result.good b { color: var(--accent-green); }
.wf-result.bad { color: var(--accent-red); } .wf-result.bad b { color: var(--accent-red); }
.fc-chart { height: 220px; padding: 4px; }
.risk-list { padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; }
.risk { display: flex; gap: 9px; align-items: flex-start; padding: 9px; border-radius: 5px; border-left: 3px solid; }
.risk.warn { border-color: var(--accent-orange); background: rgba(255,157,0,0.06); }
.risk.critical { border-color: var(--accent-red); background: rgba(255,56,96,0.07); }
.rl { font-size: 10px; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
.risk.warn .rl { background: rgba(255,157,0,0.2); color: var(--accent-orange); }
.risk.critical .rl { background: rgba(255,56,96,0.2); color: var(--accent-red); }
.rmain { flex: 1; } .rtop { display: flex; gap: 10px; align-items: baseline; }
.rtop b { color: var(--text-primary); font-size: 13px; } .rm { font-size: 11px; color: var(--text-secondary); }
.rsg { font-size: 12px; color: var(--accent-cyan); margin-top: 3px; }
</style>
