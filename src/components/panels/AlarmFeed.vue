<script setup lang="ts">
import { computed } from 'vue'
import { usePlantStore } from '@/stores/plant'
import '@/styles/panel.css'

const plant = usePlantStore()

const recent = computed(() => plant.alarms.slice(0, 8))

function tsLabel(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function levelClass(l: string) {
  return `lvl lvl-${l}`
}
function levelLabel(l: string) {
  return l === 'info' ? '信息' : l === 'warn' ? '告警' : '严重'
}
</script>

<template>
  <section class="panel alarm-panel">
    <div class="panel-header">
      <span class="panel-title">事件 / 告警</span>
      <span class="metric-label">{{ plant.alarms.length }} 条</span>
    </div>
    <div class="panel-body alarm-list">
      <div v-if="recent.length === 0" class="empty">暂无事件</div>
      <div v-for="a in recent" :key="a.id" class="alarm-row">
        <span :class="levelClass(a.level)">{{ levelLabel(a.level) }}</span>
        <span class="msg">{{ a.message }}</span>
        <span class="ts">{{ tsLabel(a.ts) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.alarm-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 4px;
}
.empty { color: var(--text-dim); font-size: 12px; text-align: center; padding: 12px; }
.alarm-row {
  display: grid;
  grid-template-columns: 38px 1fr 60px;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  padding: 4px 6px;
  border-left: 2px solid transparent;
}
.alarm-row:hover { background: rgba(0, 212, 255, 0.05); }
.lvl {
  font-size: 10px; padding: 1px 4px; border-radius: 2px;
  text-align: center; letter-spacing: 1px;
}
.lvl-info { background: rgba(0, 212, 255, 0.15); color: var(--accent-cyan); }
.lvl-warn { background: rgba(255, 157, 0, 0.18); color: var(--accent-orange); }
.lvl-critical { background: rgba(255, 56, 96, 0.2); color: var(--accent-red); }
.msg { color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ts { color: var(--text-dim); font-variant-numeric: tabular-nums; font-size: 11px; }
</style>
