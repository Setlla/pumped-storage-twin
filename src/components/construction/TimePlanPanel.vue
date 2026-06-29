<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { timePhasedPlan, PLAN_MODE_LABEL, type PlanMode } from '@/logic/timePlan'
import '@/styles/panel.css'

const c = useConstructionStore()
const plan = computed(() => timePhasedPlan(c.cutZones, c.fillZones))
const sel = ref(0)

// 跟随时间轴定位当前季度
watch(() => c.currentMonth, (m) => {
  const p = plan.value.find((x) => m >= x.mStart && m < x.mEnd) || plan.value[plan.value.length - 1]
  if (p) sel.value = p.idx
}, { immediate: true })

const cur = computed(() => plan.value.find((p) => p.idx === sel.value) || plan.value[0])
const maxVol = computed(() => Math.max(1, ...plan.value.map((p) => p.totalVol)))

function nameOf(id: string): string {
  if (id === 'spoil') return '1#弃渣场'
  if (id === 'borrow') return '料场(外购/加工)'
  if (id === 'stockpile') return '中转料场'
  const z = c.cutZones.find((x) => x.id === id) || c.fillZones.find((x) => x.id === id)
  return z ? z.name : id
}
function modeCls(m: PlanMode) {
  return m === 'direct' ? 'm-direct' : m === 'to-stock' ? 'm-tostock' : m === 'from-stock' ? 'm-fromstock' : m === 'spoil' ? 'm-spoil' : 'm-borrow'
}
</script>

<template>
  <div class="tpl-wrap">
    <div class="head">
      <span class="ht">分时段调配计划</span>
      <span class="hs">什么时间 · 把哪儿的料 · 搬到哪儿 · 搬多少(逐季度,跟随时间轴)</span>
    </div>

    <!-- 季度时间条 -->
    <div class="period-strip">
      <div
        v-for="p in plan" :key="p.idx"
        class="pcell" :class="{ on: p.idx === sel }"
        @click="sel = p.idx" :title="p.label + ' · ' + p.totalVol + '万m³'"
      >
        <div class="pbar" :style="{ height: 8 + (p.totalVol / maxVol) * 46 + 'px' }" />
        <div class="plb">{{ p.label.slice(0, 4) }}</div>
      </div>
    </div>

    <!-- 当前季度调配明细 -->
    <div v-if="cur" class="detail">
      <div class="dh">
        <span class="dt">{{ cur.label }} 季度</span>
        <span class="dv">本季调配 {{ cur.totalVol }} 万m³ · {{ cur.entries.length }} 条</span>
      </div>
      <div class="cards">
        <div v-for="(e, i) in cur.entries" :key="i" class="card" :class="modeCls(e.mode)">
          <div class="route">
            <span class="from">{{ nameOf(e.from) }}</span>
            <span class="arrow">→</span>
            <span class="to">{{ nameOf(e.to) }}</span>
          </div>
          <div class="meta">
            <span class="vol">{{ e.vol }} <small>万m³</small></span>
            <span class="mode">{{ PLAN_MODE_LABEL[e.mode] }}</span>
          </div>
        </div>
        <div v-if="cur.entries.length === 0" class="empty">本季度无调配</div>
      </div>
    </div>

    <div class="note">
      绿=直接上坝 · 橙=进中转(早挖暂存) · 蓝=中转回采(后期上坝) · 紫=弃渣 · 黄=外购。
      "进中转→中转回采"即<b>开挖与填筑的时间错配</b>:东西先搬到中转料场存着,等坝体需要时再搬上去。
    </div>
  </div>
</template>

<style scoped>
.tpl-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; background: #061222; padding: 12px; gap: 10px; overflow: hidden; }
.head { flex-shrink: 0; }
.ht { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.hs { font-size: 12px; color: var(--text-secondary); margin-left: 10px; }
.period-strip { display: flex; gap: 3px; align-items: flex-end; height: 72px; flex-shrink: 0; padding: 4px 2px; overflow-x: auto; border-bottom: 1px solid var(--border-line); }
.pcell { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; min-width: 26px; }
.pbar { width: 16px; border-radius: 3px 3px 0 0; background: rgba(0,212,255,0.35); transition: background 0.2s; }
.pcell:hover .pbar { background: rgba(0,212,255,0.6); }
.pcell.on .pbar { background: linear-gradient(180deg, var(--accent-cyan), #0099ff); box-shadow: 0 0 8px rgba(0,212,255,0.6); }
.plb { font-size: 9px; color: var(--text-dim); }
.pcell.on .plb { color: var(--accent-cyan); font-weight: 600; }
.detail { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.dh { display: flex; align-items: baseline; gap: 12px; padding: 4px 2px 10px; }
.dt { font-size: 20px; font-weight: 700; color: var(--accent-cyan); }
.dv { font-size: 12px; color: var(--text-secondary); }
.cards { flex: 1; overflow: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; align-content: start; }
.card { background: rgba(0,30,60,0.35); border: 1px solid var(--border-line); border-left-width: 3px; border-radius: 5px; padding: 10px 12px; }
.card.m-direct { border-left-color: var(--accent-green); }
.card.m-tostock { border-left-color: var(--accent-orange); }
.card.m-fromstock { border-left-color: var(--accent-cyan); }
.card.m-spoil { border-left-color: var(--accent-purple); }
.card.m-borrow { border-left-color: #ffce5c; }
.route { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-primary); }
.arrow { color: var(--accent-cyan); font-weight: 700; }
.from, .to { font-weight: 600; }
.meta { display: flex; justify-content: space-between; align-items: baseline; margin-top: 6px; }
.vol { font-size: 17px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.vol small { font-size: 10px; color: var(--text-dim); }
.mode { font-size: 11px; color: var(--text-secondary); padding: 2px 8px; border: 1px solid var(--border-line); border-radius: 3px; }
.empty { color: var(--text-dim); padding: 20px; }
.note { flex-shrink: 0; font-size: 11px; color: var(--text-secondary); line-height: 1.6; border-top: 1px solid var(--border-line); padding-top: 8px; }
.note b { color: var(--accent-orange); }
</style>
