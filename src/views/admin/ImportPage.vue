<script setup lang="ts">
import { useConstructionStore } from '@/stores/construction'
import DataImportBar from '@/components/construction/DataImportBar.vue'

const c = useConstructionStore()
</script>

<template>
  <div class="page">
    <DataImportBar />
    <div class="hint">下载模板 → 填写真实开挖/填筑方量、计划、可利用率 → 导入。导入后,大屏与各业务模块即基于该台账计算。仓库 <code>samples/</code> 下附示例台账。</div>

    <section class="panel">
      <div class="ph">当前台账 · 开挖 {{ c.cutZones.length }} 项</div>
      <table>
        <thead><tr><th>编号</th><th>名称</th><th>计划方量(万m³)</th><th>可利用率</th><th>开工月</th><th>工期月</th></tr></thead>
        <tbody>
          <tr v-for="z in c.cutZones" :key="z.id"><td>{{ z.id }}</td><td>{{ z.name }}</td><td class="n">{{ z.planM3 }}</td><td class="n">{{ (z.usableRate*100).toFixed(0) }}%</td><td class="n">{{ z.startMonth }}</td><td class="n">{{ z.durMonth }}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="panel">
      <div class="ph">当前台账 · 填筑 {{ c.fillZones.length }} 项</div>
      <table>
        <thead><tr><th>编号</th><th>名称</th><th>计划方量(万m³)</th><th>开工月</th><th>工期月</th></tr></thead>
        <tbody>
          <tr v-for="z in c.fillZones" :key="z.id"><td>{{ z.id }}</td><td>{{ z.name }}</td><td class="n">{{ z.planM3 }}</td><td class="n">{{ z.startMonth }}</td><td class="n">{{ z.durMonth }}</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.hint { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.hint code { color: var(--accent-cyan); }
.panel { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; overflow: hidden; }
.ph { padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border-line); }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { text-align: left; padding: 8px 12px; color: var(--text-secondary); font-weight: 500; border-bottom: 1px solid var(--border-line); }
tbody td { padding: 7px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.n { text-align: right; font-variant-numeric: tabular-nums; }
</style>
