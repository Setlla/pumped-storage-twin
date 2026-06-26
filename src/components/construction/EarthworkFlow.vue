<script setup lang="ts">
import { computed } from 'vue'
import { CUT_ZONES, FILL_ZONES, HAUL_PLAN, SPOIL_YARD, BORROW_AREA } from '@/data/construction'

const W = 900
const H = 540
const LX = 250 // 左列节点右缘
const RX = 650 // 右列节点左缘
const NODE_W = 150
const NODE_H = 40

// 左侧来源: 开挖区 + 料场
const sources = computed(() => {
  const list = [
    ...CUT_ZONES.map((z) => ({ id: z.id, name: z.name, m3: z.planM3, kind: 'cut' })),
    { id: 'borrow', name: BORROW_AREA.name, m3: BORROW_AREA.reserveM3, kind: 'borrow' }
  ]
  const gap = (H - 60) / list.length
  return list.map((n, i) => ({ ...n, y: 40 + gap * i + gap / 2 }))
})

// 右侧去向: 填筑区 + 弃渣场
const sinks = computed(() => {
  const list = [
    ...FILL_ZONES.map((z) => ({ id: z.id, name: z.name, m3: z.planM3, kind: 'fill' })),
    { id: 'spoil', name: SPOIL_YARD.name, m3: SPOIL_YARD.capacityM3, kind: 'spoil' }
  ]
  const gap = (H - 60) / list.length
  return list.map((n, i) => ({ ...n, y: 40 + gap * i + gap / 2 }))
})

const links = computed(() =>
  HAUL_PLAN.map((h) => {
    const s = sources.value.find((x) => x.id === h.from)
    const t = sinks.value.find((x) => x.id === h.to)
    if (!s || !t) return null
    const x1 = LX
    const x2 = RX - NODE_W
    const cx = (x1 + x2) / 2
    const path = `M ${x1} ${s.y} C ${cx} ${s.y}, ${cx} ${t.y}, ${x2} ${t.y}`
    const w = Math.max(1.5, Math.sqrt(h.m3) * 0.9)
    const color = h.to === 'spoil' ? '#a78bfa' : h.from === 'borrow' ? '#ff9d00' : '#00d4ff'
    return { path, w, color, m3: h.m3, key: `${h.from}-${h.to}` }
  }).filter(Boolean) as { path: string; w: number; color: string; m3: number; key: string }[]
)

function nodeColor(kind: string) {
  return kind === 'cut' ? '#ff9d00'
    : kind === 'borrow' ? '#ffce5c'
    : kind === 'fill' ? '#00d4ff'
    : '#a78bfa'
}
</script>

<template>
  <div class="flow-wrap">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="xMidYMid meet" class="flow-svg">
      <!-- 标题 -->
      <text x="40" y="26" class="col-title" fill="#ff9d00">开挖 / 料场（来源）</text>
      <text :x="W - 40" y="26" class="col-title" fill="#00d4ff" text-anchor="end">填筑 / 弃渣（去向）</text>

      <!-- 调配流向 -->
      <g>
        <path
          v-for="l in links" :key="l.key"
          :d="l.path" :stroke="l.color" :stroke-width="l.w"
          fill="none" class="flow-link" :style="{ opacity: 0.5 }"
        />
        <path
          v-for="l in links" :key="l.key + '-anim'"
          :d="l.path" :stroke="l.color" :stroke-width="Math.max(1, l.w * 0.5)"
          fill="none" class="flow-anim"
        />
      </g>

      <!-- 左侧来源节点 -->
      <g v-for="s in sources" :key="s.id">
        <rect
          :x="LX - NODE_W" :y="s.y - NODE_H / 2" :width="NODE_W" :height="NODE_H" rx="4"
          :fill="'rgba(8,22,42,0.9)'" :stroke="nodeColor(s.kind)" stroke-width="1.5"
        />
        <text :x="LX - NODE_W / 2" :y="s.y - 3" class="node-name" text-anchor="middle">{{ s.name }}</text>
        <text :x="LX - NODE_W / 2" :y="s.y + 12" class="node-val" :fill="nodeColor(s.kind)" text-anchor="middle">{{ s.m3 }} 万m³</text>
      </g>

      <!-- 右侧去向节点 -->
      <g v-for="t in sinks" :key="t.id">
        <rect
          :x="RX - NODE_W" :y="t.y - NODE_H / 2" :width="NODE_W" :height="NODE_H" rx="4"
          :fill="'rgba(8,22,42,0.9)'" :stroke="nodeColor(t.kind)" stroke-width="1.5"
        />
        <text :x="RX - NODE_W / 2" :y="t.y - 3" class="node-name" text-anchor="middle">{{ t.name }}</text>
        <text :x="RX - NODE_W / 2" :y="t.y + 12" class="node-val" :fill="nodeColor(t.kind)" text-anchor="middle">{{ t.m3 }} 万m³</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.flow-wrap {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.05), transparent 60%), #061222;
}
.flow-svg { width: 100%; height: 100%; }
.col-title { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
.node-name { fill: #e6f1ff; font-size: 11px; font-weight: 600; }
.node-val { font-size: 11px; font-variant-numeric: tabular-nums; }
.flow-anim {
  stroke-dasharray: 6 16;
  animation: haul 1.1s linear infinite;
  filter: drop-shadow(0 0 3px currentColor);
}
@keyframes haul { to { stroke-dashoffset: -22; } }
</style>
