<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { useAllocationConfig } from '@/stores/allocationConfig'
import { computeAllocation, STRATEGY_LABEL, type HaulMode, type Strategy } from '@/logic/allocation'
import { ElMessageBox, ElMessage } from 'element-plus'
import '@/styles/panel.css'

const c = useConstructionStore()
const cfg = useAllocationConfig()

function run(strategy: Strategy) {
  return computeAllocation(c.cutZones, c.fillZones, {
    truckCapacityM3: cfg.truckCapacityM3,
    costPerKmPerTrip: cfg.costPerKmPerTrip,
    stockpileLeadMonth: cfg.stockpileLeadMonth,
    strategy
  })
}
const result = computed(() => run(cfg.strategy))
const strategies: Strategy[] = ['distance', 'cost', 'utilization']
const compare = computed(() => strategies.map((s) => ({ s, label: STRATEGY_LABEL[s], kpi: run(s).kpi })))
function onCfg() { cfg.persist() }

async function saveCurrent() {
  try {
    const { value } = await ElMessageBox.prompt('方案名称', '保存调配方案', {
      inputValue: `${STRATEGY_LABEL[cfg.strategy]}-${c.monthText}`, confirmButtonText: '保存', cancelButtonText: '取消'
    })
    cfg.saveScheme(value || STRATEGY_LABEL[cfg.strategy], result.value.kpi)
    ElMessage.success('方案已保存')
  } catch {}
}

const modeLabel: Record<HaulMode, string> = {
  direct: '直接上坝', stockpile: '经中转', spoil: '弃渣', borrow: '外购'
}
const modeCls: Record<HaulMode, string> = {
  direct: 'm-direct', stockpile: 'm-stock', spoil: 'm-spoil', borrow: 'm-borrow'
}
</script>

<template>
  <div class="alloc-wrap">
    <!-- 可配置调配参数 -->
    <div class="cfg-bar">
      <span class="cfg-t">调配参数</span>
      <label>单车方量<input type="number" v-model.number="cfg.truckCapacityM3" @change="onCfg" /><i>m³</i></label>
      <label>运输单价<input type="number" v-model.number="cfg.costPerKmPerTrip" @change="onCfg" /><i>元/车·km</i></label>
      <label>中转判定提前期<input type="number" v-model.number="cfg.stockpileLeadMonth" @change="onCfg" /><i>月</i></label>
      <button class="cfg-reset" @click="cfg.reset()">恢复默认</button>
    </div>

    <!-- 多目标方案对比 -->
    <div class="scheme-bar">
      <span class="cfg-t">优化目标</span>
      <button
        v-for="cm in compare" :key="cm.s"
        class="sc-btn" :class="{ on: cfg.strategy === cm.s }"
        @click="cfg.setStrategy(cm.s)"
      >
        <div class="sc-label">{{ cm.label }}</div>
        <div class="sc-kpi">运距 {{ cm.kpi.avgHaulKm }}km · 成本 {{ cm.kpi.totalCostWan }}万 · 中转 {{ cm.kpi.stockpileM3 }}</div>
      </button>
      <button class="cfg-reset" @click="saveCurrent">保存方案</button>
    </div>

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
.cfg-bar { display: flex; align-items: center; gap: 14px; padding: 8px 12px; background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; flex-shrink: 0; flex-wrap: wrap; }
.cfg-t { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.cfg-bar label { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary); }
.cfg-bar input { width: 64px; background: rgba(0,30,60,0.4); border: 1px solid var(--border-line); border-radius: 4px; color: var(--text-primary); padding: 4px 6px; font-size: 12px; }
.cfg-bar i { font-style: normal; color: var(--text-dim); font-size: 11px; }
.cfg-reset { margin-left: auto; padding: 4px 10px; font-size: 11px; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.scheme-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; flex-shrink: 0; }
.sc-btn { flex: 1; text-align: left; padding: 6px 12px; border: 1px solid var(--border-line); border-radius: 5px; background: transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.sc-btn.on { border-color: var(--accent-cyan); background: rgba(0,212,255,0.1); }
.sc-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.sc-btn.on .sc-label { color: var(--accent-cyan); }
.sc-kpi { font-size: 10px; color: var(--text-secondary); margin-top: 2px; font-variant-numeric: tabular-nums; }
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
