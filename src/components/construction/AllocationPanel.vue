<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { computeAllocation, type HaulMode } from '@/logic/allocation'
import '@/styles/panel.css'

const c = useConstructionStore()
const result = computed(() => computeAllocation(c.cutZones, c.fillZones))

const modeLabel: Record<HaulMode, string> = {
  direct: '直接上坝', stockpile: '经中转', spoil: '弃渣', borrow: '外购'
}
const modeCls: Record<HaulMode, string> = {
  direct: 'm-direct', stockpile: 'm-stock', spoil: 'm-spoil', borrow: 'm-borrow'
}
</script>

<template>
  <div class="alloc-wrap">
    <!-- KPI -->
    <div class="kpis">
      <div class="kpi"><div class="kv hi">{{ result.kpi.directRate }}<small>%</small></div><div class="kl">直接上坝率</div></div>
      <div class="kpi"><div class="kv">{{ result.kpi.spoilRate }}<small>%</small></div><div class="kl">弃方率</div></div>
      <div class="kpi"><div class="kv">{{ result.kpi.avgHaulKm }}<small>km</small></div><div class="kl">平均运距</div></div>
      <div class="kpi"><div class="kv">{{ (result.kpi.totalTrips / 10000).toFixed(1) }}<small>万车次</small></div><div class="kl">总运输车次</div></div>
      <div class="kpi"><div class="kv">{{ result.kpi.totalCostWan }}<small>万元</small></div><div class="kl">运输成本估算</div></div>
      <div class="kpi"><div class="kv warn">{{ result.kpi.borrowM3 }}<small>万m³</small></div><div class="kl">外购/加工料</div></div>
    </div>

    <div class="cols">
      <!-- 调配建议表 -->
      <section class="panel tbl-panel">
        <div class="panel-header">
          <span class="panel-title">分来源-去向调配建议</span>
          <span class="metric-label">规则型 · 可解释 · 供人工复核</span>
        </div>
        <div class="tbl-scroll">
          <table>
            <thead>
              <tr><th>来源</th><th>去向</th><th>方式</th><th>方量<small>万m³</small></th><th>运距<small>km</small></th><th>车次</th><th>成本<small>万元</small></th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr v-for="(a, i) in result.allocations" :key="i">
                <td>{{ a.fromName }}</td>
                <td>{{ a.toName }}</td>
                <td><span class="tag" :class="modeCls[a.mode]">{{ modeLabel[a.mode] }}</span></td>
                <td class="num">{{ a.m3 }}</td>
                <td class="num">{{ a.distanceKm }}</td>
                <td class="num">{{ a.trips.toLocaleString() }}</td>
                <td class="num">{{ a.costWan }}</td>
                <td class="reason">{{ a.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 冲突预警 -->
      <section class="panel warn-panel">
        <div class="panel-header">
          <span class="panel-title">调配冲突与预警</span>
          <span class="metric-label">{{ result.warnings.length }} 项</span>
        </div>
        <div class="warn-list">
          <div v-if="result.warnings.length === 0" class="empty">无冲突</div>
          <div v-for="(w, i) in result.warnings" :key="i" class="warn-row" :class="w.level">
            <span class="wtag">{{ w.level === 'critical' ? '严重' : '提示' }}</span>
            <span class="wtext">{{ w.text }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.alloc-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; overflow: hidden; background: #061222; }
.kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; flex-shrink: 0; }
.kpi { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 10px 12px; text-align: center; }
.kv { font-size: 22px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.kv.hi { color: var(--accent-green); }
.kv.warn { color: var(--accent-orange); }
.kv small { font-size: 11px; color: var(--text-dim); margin-left: 2px; font-weight: 400; }
.kl { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
.cols { flex: 1; display: grid; grid-template-columns: 1.6fr 1fr; gap: 10px; min-height: 0; }
.panel { display: flex; flex-direction: column; min-height: 0; }
.tbl-scroll { overflow: auto; padding: 0 4px 8px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { position: sticky; top: 0; background: var(--bg-panel-strong); color: var(--text-secondary); font-weight: 500; text-align: left; padding: 8px 8px; border-bottom: 1px solid var(--border-line); white-space: nowrap; }
thead th small { color: var(--text-dim); font-weight: 400; margin-left: 2px; }
tbody td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
tbody td.reason { color: var(--text-secondary); font-size: 11px; }
tbody tr:hover { background: rgba(0,212,255,0.05); }
.tag { font-size: 10px; padding: 1px 7px; border-radius: 3px; white-space: nowrap; }
.m-direct { background: rgba(0,255,136,0.16); color: var(--accent-green); }
.m-stock { background: rgba(255,206,92,0.16); color: #ffce5c; }
.m-spoil { background: rgba(167,139,250,0.16); color: var(--accent-purple); }
.m-borrow { background: rgba(255,157,0,0.16); color: var(--accent-orange); }
.warn-list { overflow: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.empty { color: var(--text-dim); text-align: center; padding: 20px; }
.warn-row { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; padding: 7px 8px; border-radius: 4px; border-left: 2px solid; }
.warn-row.warn { border-color: var(--accent-orange); background: rgba(255,157,0,0.06); }
.warn-row.critical { border-color: var(--accent-red); background: rgba(255,56,96,0.07); }
.wtag { font-size: 10px; padding: 1px 6px; border-radius: 3px; flex-shrink: 0; }
.warn-row.warn .wtag { background: rgba(255,157,0,0.2); color: var(--accent-orange); }
.warn-row.critical .wtag { background: rgba(255,56,96,0.2); color: var(--accent-red); }
.wtext { color: var(--text-primary); line-height: 1.5; }
</style>
