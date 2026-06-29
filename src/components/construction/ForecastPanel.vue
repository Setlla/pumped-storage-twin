<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { computeForecast } from '@/logic/forecast'
import { monthLabel } from '@/data/construction'
import '@/styles/panel.css'

const c = useConstructionStore()
const fc = computed(() => computeForecast(c.series, c.currentMonth))
function stText(s: string) { return s === 'ok' ? '正常' : s === 'warn' ? '关注' : '超限' }
</script>

<template>
  <div class="fc-wrap">
    <div class="kpis">
      <div class="kpi"><div class="kv">{{ c.monthText }}</div><div class="kl">当前时点</div></div>
      <div class="kpi"><div class="kv warn">{{ fc.peakStock }}<small>万m³</small></div><div class="kl">中转堆存峰值</div></div>
      <div class="kpi"><div class="kv">{{ monthLabel(fc.peakStockMonth) }}</div><div class="kl">峰值出现</div></div>
      <div class="kpi"><div class="kv" :class="fc.risks.some(r => r.level==='critical') ? 'crit' : 'okc'">{{ fc.risks.filter(r => r.level==='critical').length }}</div><div class="kl">严重风险点</div></div>
    </div>

    <section class="panel">
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

    <section class="panel">
      <div class="panel-header"><span class="panel-title">分阶段供需预测</span><span class="metric-label">单位 万m³</span></div>
      <div class="tbl-scroll">
        <table>
          <thead><tr><th>时点</th><th>累计可利用开挖</th><th>累计填筑</th><th>中转堆存</th><th>累计弃渣</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="row in fc.rows" :key="row.month">
              <td>{{ monthLabel(row.month) }}</td>
              <td class="num">{{ row.cumCut }}</td>
              <td class="num">{{ row.cumFill }}</td>
              <td class="num">{{ row.stock }}</td>
              <td class="num">{{ row.spoil }}</td>
              <td><span class="st" :class="row.status">{{ stText(row.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="fc-note">说明:基于当前进度计划滚动推演;调整工区开工/工期(基础资料或导入台账)后,预判随之更新。</div>
    </section>
  </div>
</template>

<style scoped>
.fc-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #061222; overflow: hidden; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex-shrink: 0; }
.kpi { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 10px 12px; text-align: center; }
.kv { font-size: 20px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.kv small { font-size: 11px; color: var(--text-dim); margin-left: 2px; font-weight: 400; }
.kv.warn { color: var(--accent-orange); }
.kv.crit { color: var(--accent-red); }
.kv.okc { color: var(--accent-green); }
.kl { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
.panel { display: flex; flex-direction: column; min-height: 0; }
.risk-list { padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; overflow: auto; max-height: 200px; }
.risk { display: flex; gap: 9px; align-items: flex-start; padding: 9px; border-radius: 5px; border-left: 3px solid; }
.risk.warn { border-color: var(--accent-orange); background: rgba(255,157,0,0.06); }
.risk.critical { border-color: var(--accent-red); background: rgba(255,56,96,0.07); }
.rl { font-size: 10px; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
.risk.warn .rl { background: rgba(255,157,0,0.2); color: var(--accent-orange); }
.risk.critical .rl { background: rgba(255,56,96,0.2); color: var(--accent-red); }
.rmain { flex: 1; }
.rtop { display: flex; gap: 10px; align-items: baseline; }
.rtop b { color: var(--text-primary); font-size: 13px; }
.rm { font-size: 11px; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.rsg { font-size: 12px; color: var(--accent-cyan); margin-top: 3px; }
.tbl-scroll { overflow: auto; flex: 1; padding: 0 4px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { position: sticky; top: 0; background: var(--bg-panel-strong); color: var(--text-secondary); font-weight: 500; text-align: left; padding: 8px; border-bottom: 1px solid var(--border-line); white-space: nowrap; }
tbody td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
.st { font-size: 10px; padding: 1px 7px; border-radius: 3px; }
.st.ok { background: rgba(0,255,136,0.16); color: var(--accent-green); }
.st.warn { background: rgba(255,157,0,0.16); color: var(--accent-orange); }
.st.crit { background: rgba(255,56,96,0.16); color: var(--accent-red); }
.fc-note { font-size: 11px; color: var(--text-secondary); padding: 8px 12px; border-top: 1px solid var(--border-line); line-height: 1.5; }
</style>
