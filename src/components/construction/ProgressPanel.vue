<script setup lang="ts">
import { useConstructionStore } from '@/stores/construction'
import '@/styles/panel.css'

const c = useConstructionStore()
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <span class="panel-title">形象进度</span>
      <span class="metric-label">总体 {{ c.overallProgress.toFixed(1) }}%</span>
    </div>
    <div class="panel-body">
      <div class="overall">
        <div class="bar big"><div class="bar-fill all" :style="{ width: c.overallProgress + '%' }" /></div>
      </div>

      <div class="zone-group">
        <div class="zg-title cut">开挖工程</div>
        <div v-for="z in c.cutProgress" :key="z.id" class="zrow">
          <span class="zname">{{ z.name }}</span>
          <div class="bar"><div class="bar-fill cut" :style="{ width: z.progress * 100 + '%' }" /></div>
          <span class="zpct">{{ (z.progress * 100).toFixed(0) }}%</span>
        </div>
      </div>

      <div class="zone-group">
        <div class="zg-title fill">填筑工程</div>
        <div v-for="z in c.fillProgress" :key="z.id" class="zrow">
          <span class="zname">{{ z.name }}</span>
          <div class="bar"><div class="bar-fill fill" :style="{ width: z.progress * 100 + '%' }" /></div>
          <span class="zpct">{{ (z.progress * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.overall { margin-bottom: 12px; }
.bar { height: 6px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; flex: 1; }
.bar.big { height: 10px; border-radius: 5px; }
.bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
.bar-fill.all { background: linear-gradient(90deg, #00d4ff, #00ff88); box-shadow: 0 0 10px rgba(0,212,255,0.5); }
.bar-fill.cut { background: linear-gradient(90deg, #ff9d00, #ff5c00); }
.bar-fill.fill { background: linear-gradient(90deg, #00d4ff, #0099ff); }
.zone-group { margin-top: 10px; }
.zg-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; letter-spacing: 1px; }
.zg-title.cut { color: #ff9d00; }
.zg-title.fill { color: #00d4ff; }
.zrow { display: grid; grid-template-columns: 96px 1fr 36px; gap: 8px; align-items: center; margin-bottom: 5px; }
.zname { font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.zpct { font-size: 11px; color: var(--text-primary); text-align: right; font-variant-numeric: tabular-nums; }
</style>
