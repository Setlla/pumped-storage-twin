<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { SPOIL_YARD, STOCKPILE } from '@/data/construction'
import '@/styles/panel.css'

const c = useConstructionStore()

const balDash = computed(() => {
  const circ = 2 * Math.PI * 28
  const p = Math.min(100, c.balanceRate) / 100
  return `${(circ * p).toFixed(1)} ${circ.toFixed(1)}`
})
const balColor = computed(() =>
  c.balanceRate >= 95 ? '#00ff88' : c.balanceRate >= 80 ? '#ff9d00' : '#ff3860'
)
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <span class="panel-title">土石方平衡</span>
      <span class="metric-label">单位：万 m³</span>
    </div>
    <div class="panel-body">
      <div class="bal-top">
        <div class="bal-ring">
          <svg viewBox="0 0 68 68">
            <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6" />
            <circle
              cx="34" cy="34" r="28" fill="none" :stroke="balColor" stroke-width="6"
              stroke-linecap="round" :stroke-dasharray="balDash"
              transform="rotate(-90 34 34)" style="transition: stroke-dasharray 0.6s"
            />
          </svg>
          <div class="bal-center">
            <b :style="{ color: balColor }">{{ c.balanceRate.toFixed(0) }}<small>%</small></b>
            <span>挖填平衡率</span>
          </div>
        </div>
        <div class="bal-kpis">
          <div class="bk"><label>总开挖</label><b class="cut">{{ c.cutPlan.toFixed(0) }}</b></div>
          <div class="bk"><label>总填筑</label><b class="fill">{{ c.fillPlan.toFixed(0) }}</b></div>
          <div class="bk"><label>可利用方</label><b class="use">{{ c.usablePlan.toFixed(0) }}</b></div>
          <div class="bk"><label>余方(弃渣)</label><b class="spoil">{{ c.surplus.toFixed(0) }}</b></div>
        </div>
      </div>

      <div class="util-row">
        <span class="metric-label">开挖料综合利用率</span>
        <span class="util-val">{{ c.utilizationRate.toFixed(1) }}%</span>
      </div>
      <div class="bar"><div class="bar-fill use" :style="{ width: c.utilizationRate + '%' }" /></div>

      <div class="yard">
        <div class="yard-item">
          <div class="yard-h"><span>{{ STOCKPILE.name }}</span><span>{{ c.stockPct.toFixed(0) }}%</span></div>
          <div class="bar"><div class="bar-fill stock" :style="{ width: c.stockPct + '%' }" /></div>
          <small>{{ c.stockNow.toFixed(0) }} / {{ STOCKPILE.capacityM3 }} 万m³ · 当前堆存</small>
        </div>
        <div class="yard-item">
          <div class="yard-h"><span>{{ SPOIL_YARD.name }}</span><span>{{ c.spoilPct.toFixed(0) }}%</span></div>
          <div class="bar"><div class="bar-fill spoil" :style="{ width: c.spoilPct + '%' }" /></div>
          <small>{{ c.spoilUsed.toFixed(0) }} / {{ SPOIL_YARD.capacityM3 }} 万m³ · 累计弃渣</small>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bal-top { display: flex; gap: 16px; align-items: center; }
.bal-ring { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
.bal-ring svg { width: 100%; height: 100%; }
.bal-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.bal-center b { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; }
.bal-center b small { font-size: 12px; }
.bal-center span { font-size: 10px; color: var(--text-secondary); margin-top: 2px; }
.bal-kpis { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
.bk { display: flex; flex-direction: column; }
.bk label { font-size: 11px; color: var(--text-secondary); }
.bk b { font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums; }
.bk b.cut { color: #ff9d00; }
.bk b.fill { color: #00d4ff; }
.bk b.use { color: #00ff88; }
.bk b.spoil { color: #a78bfa; }
.util-row { display: flex; justify-content: space-between; align-items: baseline; margin: 14px 0 6px; }
.util-val { font-size: 15px; font-weight: 700; color: #00ff88; }
.bar { height: 6px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
.bar-fill.use { background: linear-gradient(90deg, #00ff88, #00d4ff); }
.bar-fill.stock { background: linear-gradient(90deg, #ffce5c, #ff9d00); }
.bar-fill.spoil { background: linear-gradient(90deg, #a78bfa, #7c5cff); }
.bar-fill.borrow { background: linear-gradient(90deg, #ff9d00, #ff5c00); }
.yard { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.yard-h { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.yard-item small { font-size: 10px; color: var(--text-dim); display: block; margin-top: 4px; }
</style>
