<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { useAllocationConfig } from '@/stores/allocationConfig'
import { computeAllocation } from '@/logic/allocation'

const c = useConstructionStore()
const cfg = useAllocationConfig()

const W = 900
const H = 540
const LX = 250
const RX = 650
const NODE_W = 150
const NODE_H = 40

// 由调配算法实时生成的调配关系(与"智能调配"、导入数据一致)
const alloc = computed(() => computeAllocation(c.cutZones, c.fillZones, {
  truckCapacityM3: cfg.truckCapacityM3,
  costPerKmPerTrip: cfg.costPerKmPerTrip,
  stockpileLeadMonth: cfg.stockpileLeadMonth
}))

function nameOf(id: string): string {
  if (id === 'spoil') return '1#弃渣场'
  if (id === 'borrow') return '垫层料加工区'
  const z = c.cutZones.find((x) => x.id === id) || c.fillZones.find((x) => x.id === id)
  return z ? z.name : id
}
function kindOfSource(id: string) { return id === 'borrow' ? 'borrow' : 'cut' }
function kindOfSink(id: string) { return id === 'spoil' ? 'spoil' : 'fill' }

const sources = computed(() => {
  const map = new Map<string, number>()
  alloc.value.allocations.forEach((a) => map.set(a.from, (map.get(a.from) || 0) + a.m3))
  const list = [...map.entries()].map(([id, m3]) => ({ id, name: nameOf(id), m3, kind: kindOfSource(id) }))
  const gap = (H - 60) / Math.max(1, list.length)
  return list.map((n, i) => ({ ...n, y: 40 + gap * i + gap / 2 }))
})
const sinks = computed(() => {
  const map = new Map<string, number>()
  alloc.value.allocations.forEach((a) => map.set(a.to, (map.get(a.to) || 0) + a.m3))
  const list = [...map.entries()].map(([id, m3]) => ({ id, name: nameOf(id), m3, kind: kindOfSink(id) }))
  const gap = (H - 60) / Math.max(1, list.length)
  return list.map((n, i) => ({ ...n, y: 40 + gap * i + gap / 2 }))
})
const links = computed(() =>
  alloc.value.allocations.map((h, idx) => {
    const s = sources.value.find((x) => x.id === h.from)
    const t = sinks.value.find((x) => x.id === h.to)
    if (!s || !t) return null
    const x1 = LX; const x2 = RX - NODE_W; const cx = (x1 + x2) / 2
    const path = `M ${x1} ${s.y} C ${cx} ${s.y}, ${cx} ${t.y}, ${x2} ${t.y}`
    const w = Math.max(1.5, Math.sqrt(h.m3) * 0.9)
    const color = h.to === 'spoil' ? '#a78bfa' : h.from === 'borrow' ? '#ff9d00' : '#00d4ff'
    return { path, w, color, key: `${h.from}-${h.to}-${idx}` }
  }).filter(Boolean) as { path: string; w: number; color: string; key: string }[]
)

function nodeColor(kind: string) {
  return kind === 'cut' ? '#ff9d00' : kind === 'borrow' ? '#ffce5c' : kind === 'fill' ? '#00d4ff' : '#a78bfa'
}
</script>

<template>
  <div class="flow-wrap">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="xMidYMid meet" class="flow-svg">
      <text x="40" y="26" class="col-title" fill="#ff9d00">开挖 / 料场（来源）</text>
      <text :x="W - 40" y="26" class="col-title" fill="#00d4ff" text-anchor="end">填筑 / 弃渣（去向）</text>

      <g>
        <path v-for="l in links" :key="l.key" :d="l.path" :stroke="l.color" :stroke-width="l.w" fill="none" style="opacity:0.5" />
        <path v-for="l in links" :key="l.key + '-a'" :d="l.path" :stroke="l.color" :stroke-width="Math.max(1, l.w * 0.5)" fill="none" class="flow-anim" />
      </g>

      <g v-for="s in sources" :key="s.id">
        <rect :x="LX - NODE_W" :y="s.y - NODE_H / 2" :width="NODE_W" :height="NODE_H" rx="4" fill="rgba(8,22,42,0.9)" :stroke="nodeColor(s.kind)" stroke-width="1.5" />
        <text :x="LX - NODE_W / 2" :y="s.y - 3" class="node-name" text-anchor="middle">{{ s.name }}</text>
        <text :x="LX - NODE_W / 2" :y="s.y + 12" class="node-val" :fill="nodeColor(s.kind)" text-anchor="middle">{{ s.m3.toFixed(0) }} 万m³</text>
      </g>
      <g v-for="t in sinks" :key="t.id">
        <rect :x="RX - NODE_W" :y="t.y - NODE_H / 2" :width="NODE_W" :height="NODE_H" rx="4" fill="rgba(8,22,42,0.9)" :stroke="nodeColor(t.kind)" stroke-width="1.5" />
        <text :x="RX - NODE_W / 2" :y="t.y - 3" class="node-name" text-anchor="middle">{{ t.name }}</text>
        <text :x="RX - NODE_W / 2" :y="t.y + 12" class="node-val" :fill="nodeColor(t.kind)" text-anchor="middle">{{ t.m3.toFixed(0) }} 万m³</text>
      </g>
    </svg>
    <div class="flow-note">由调配算法实时生成 · 随导入数据/参数联动 · 线宽=调配方量</div>
  </div>
</template>

<style scoped>
.flow-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.05), transparent 60%), #061222; }
.flow-svg { flex: 1; width: 100%; min-height: 0; }
.col-title { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
.node-name { fill: #e6f1ff; font-size: 11px; font-weight: 600; }
.node-val { font-size: 11px; font-variant-numeric: tabular-nums; }
.flow-anim { stroke-dasharray: 6 16; animation: haul 1.1s linear infinite; filter: drop-shadow(0 0 3px currentColor); }
@keyframes haul { to { stroke-dashoffset: -22; } }
.flow-note { font-size: 11px; color: var(--text-secondary); padding: 8px 16px; border-top: 1px solid var(--border-line); }
</style>
