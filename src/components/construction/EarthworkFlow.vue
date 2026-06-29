<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts/core'
import { SankeyChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useConstructionStore } from '@/stores/construction'
import { useAllocationConfig } from '@/stores/allocationConfig'
import { computeAllocation } from '@/logic/allocation'

echarts.use([SankeyChart, TooltipComponent, CanvasRenderer])

const c = useConstructionStore()
const cfg = useAllocationConfig()
const wrap = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const alloc = computed(() => computeAllocation(c.cutZones, c.fillZones, {
  truckCapacityM3: cfg.truckCapacityM3, costPerKmPerTrip: cfg.costPerKmPerTrip,
  stockpileLeadMonth: cfg.stockpileLeadMonth, strategy: cfg.strategy
}))

function nameOf(id: string): string {
  if (id === 'spoil') return '1#弃渣场'
  if (id === 'borrow') return '垫层料加工区'
  if (id === 'stockpile') return '中转料场'
  const z = c.cutZones.find((x) => x.id === id) || c.fillZones.find((x) => x.id === id)
  return z ? z.name : id
}
function colorOf(id: string): string {
  if (id === 'spoil') return '#a78bfa'
  if (id === 'borrow') return '#ffce5c'
  if (id === 'stockpile') return '#7c5cff'
  if (c.cutZones.find((x) => x.id === id)) return '#ff9d00'
  if (c.fillZones.find((x) => x.id === id)) return '#00d4ff'
  return '#8fa6c4'
}

function buildOption() {
  const linkMap = new Map<string, number>()
  const add = (s: string, t: string, v: number) => linkMap.set(s + '|' + t, (linkMap.get(s + '|' + t) || 0) + v)
  alloc.value.allocations.forEach((a) => {
    if (a.mode === 'stockpile') { add(a.from, 'stockpile', a.m3); add('stockpile', a.to, a.m3) }
    else add(a.from, a.to, a.m3)
  })
  const ids = new Set<string>()
  const links = [...linkMap.entries()].map(([k, v]) => {
    const [source, target] = k.split('|'); ids.add(source); ids.add(target)
    return { source: nameOf(source), target: nameOf(target), value: +v.toFixed(0),
      lineStyle: { color: target === 'spoil' ? '#a78bfa' : source === 'borrow' ? '#ffce5c' : 'source', opacity: 0.45 } }
  })
  const nodes = [...ids].map((id) => ({ name: nameOf(id), itemStyle: { color: colorOf(id) } }))
  return {
    tooltip: { trigger: 'item', backgroundColor: 'rgba(8,22,42,0.94)', borderColor: 'rgba(0,212,255,0.3)', textStyle: { color: '#e6f1ff', fontSize: 12 },
      formatter: (p: any) => p.dataType === 'edge' ? `${p.data.source} → ${p.data.target}<br/>${p.data.value} 万m³` : `${p.name}` },
    series: [{
      type: 'sankey', left: 20, right: 140, top: 20, bottom: 20,
      nodeWidth: 16, nodeGap: 12, draggable: false,
      emphasis: { focus: 'adjacency' },
      label: { color: '#e6f1ff', fontSize: 11 },
      lineStyle: { color: 'gradient', opacity: 0.42, curveness: 0.5 },
      data: nodes, links
    }]
  }
}

onMounted(() => {
  if (!wrap.value) return
  chart = echarts.init(wrap.value)
  chart.setOption(buildOption())
  const ro = new ResizeObserver(() => chart?.resize()); ro.observe(wrap.value); (wrap.value as any)._ro = ro
})
onBeforeUnmount(() => { (wrap.value as any)?._ro?.disconnect(); chart?.dispose() })
watch([alloc, () => c.currentMonth], () => chart?.setOption(buildOption()))
</script>

<template>
  <div class="flow-wrap">
    <div class="flow-head">
      <span class="ft">土石方调配流向 · 开挖 → 中转 → 填筑/弃渣</span>
      <span class="fs">由调配算法实时生成 · 悬停高亮链路 · 线宽=方量</span>
    </div>
    <div ref="wrap" class="sankey" />
    <div class="legend">
      <span><i style="background:#ff9d00" />开挖区</span>
      <span><i style="background:#7c5cff" />中转料场</span>
      <span><i style="background:#00d4ff" />填筑区</span>
      <span><i style="background:#a78bfa" />弃渣场</span>
      <span><i style="background:#ffce5c" />料场</span>
    </div>
  </div>
</template>

<style scoped>
.flow-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.05), transparent 60%), #061222; }
.flow-head { padding: 12px 16px 4px; }
.ft { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.fs { font-size: 11px; color: var(--text-secondary); margin-left: 10px; }
.sankey { flex: 1; min-height: 0; }
.legend { display: flex; gap: 16px; padding: 8px 16px; border-top: 1px solid var(--border-line); font-size: 12px; color: var(--text-secondary); }
.legend span { display: flex; align-items: center; gap: 6px; }
.legend i { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
</style>
