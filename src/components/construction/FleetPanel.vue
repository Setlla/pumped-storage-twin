<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import '@/styles/panel.css'

const c = useConstructionStore()

const slopeLevel = computed(() =>
  c.slopeDisp < 3 ? { t: '正常', cls: 'ok' } : c.slopeDisp < 5 ? { t: '关注', cls: 'warn' } : { t: '预警', cls: 'crit' }
)
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <span class="panel-title">智慧工地 · 设备与监测</span>
      <span class="metric-label">实时</span>
    </div>
    <div class="panel-body">
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-v">{{ c.tripsToday }}</div>
          <div class="stat-l">今日运输车次</div>
        </div>
        <div class="stat">
          <div class="stat-v">{{ c.movedTodayM3.toFixed(1) }}<small>万m³</small></div>
          <div class="stat-l">今日完成方量</div>
        </div>
        <div class="stat">
          <div class="stat-v">{{ c.trucks }}<small>台</small></div>
          <div class="stat-l">在场渣土车</div>
        </div>
        <div class="stat">
          <div class="stat-v">{{ c.excavators }}<small>台</small></div>
          <div class="stat-l">在场挖机</div>
        </div>
        <div class="stat">
          <div class="stat-v hi">{{ c.rollersAuto }}<small>台</small></div>
          <div class="stat-l">无人碾压机</div>
        </div>
        <div class="stat">
          <div class="stat-v hi">{{ c.compactionPass }}<small>遍</small></div>
          <div class="stat-l">实时碾压遍数</div>
        </div>
      </div>

      <div class="monitor">
        <div class="mon-row">
          <span class="mon-l">高边坡位移监测</span>
          <span class="mon-tag" :class="slopeLevel.cls">{{ slopeLevel.t }}</span>
        </div>
        <div class="mon-v">{{ c.slopeDisp.toFixed(1) }} <small>mm</small>
          <span class="mon-th">（预警阈值 5.0mm）</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.stat {
  background: rgba(0,30,60,0.35); border: 1px solid var(--border-line);
  border-radius: 4px; padding: 8px; text-align: center;
}
.stat-v { font-size: 20px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.stat-v.hi { color: var(--accent-green); }
.stat-v small { font-size: 10px; color: var(--text-dim); margin-left: 1px; font-weight: 400; }
.stat-l { font-size: 10px; color: var(--text-secondary); margin-top: 3px; }
.monitor { margin-top: 12px; padding: 10px; background: rgba(0,30,60,0.3); border-radius: 4px; border: 1px solid var(--border-line); }
.mon-row { display: flex; justify-content: space-between; align-items: center; }
.mon-l { font-size: 12px; color: var(--text-secondary); }
.mon-tag { font-size: 11px; padding: 1px 8px; border-radius: 3px; }
.mon-tag.ok { background: rgba(0,255,136,0.16); color: var(--accent-green); }
.mon-tag.warn { background: rgba(255,157,0,0.16); color: var(--accent-orange); }
.mon-tag.crit { background: rgba(255,56,96,0.16); color: var(--accent-red); }
.mon-v { font-size: 22px; font-weight: 700; color: var(--accent-cyan); margin-top: 4px; font-variant-numeric: tabular-nums; }
.mon-v small { font-size: 11px; color: var(--text-dim); }
.mon-th { font-size: 10px; color: var(--text-dim); font-weight: 400; margin-left: 6px; }
</style>
