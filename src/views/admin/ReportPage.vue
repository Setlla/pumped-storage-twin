<script setup lang="ts">
import { useAllocationConfig } from '@/stores/allocationConfig'
import ReportBar from '@/components/construction/ReportBar.vue'

const cfg = useAllocationConfig()
function fmt(ts: number) { const d = new Date(ts); return `${d.getMonth()+1}-${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
</script>

<template>
  <div class="page">
    <ReportBar />
    <div class="hint">报表导出为多 Sheet Excel:项目概况 / 土石方平衡 / 设计vs实测偏差 / 调配方案 / 方案对比 / 料源利用率 / 预警清单。</div>

    <section class="panel">
      <div class="ph">已保存调配方案 · {{ cfg.schemes.length }} 个</div>
      <table v-if="cfg.schemes.length">
        <thead><tr><th>名称</th><th>优化目标</th><th>直接上坝率</th><th>弃方率</th><th>平均运距</th><th>成本(万)</th><th>保存时间</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in cfg.schemes" :key="s.id">
            <td>{{ s.name }}</td><td>{{ s.strategy }}</td>
            <td class="n">{{ s.kpi.directRate }}%</td><td class="n">{{ s.kpi.spoilRate }}%</td>
            <td class="n">{{ s.kpi.avgHaulKm }}km</td><td class="n">{{ s.kpi.totalCostWan }}</td>
            <td class="n">{{ fmt(s.ts) }}</td>
            <td><button class="del" @click="cfg.removeScheme(s.id)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无保存方案,可在"调配方案与参数"中保存。</div>
    </section>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.hint { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.panel { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; overflow: hidden; }
.ph { padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border-line); }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { text-align: left; padding: 8px 12px; color: var(--text-secondary); font-weight: 500; border-bottom: 1px solid var(--border-line); }
tbody td { padding: 7px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.n { text-align: right; font-variant-numeric: tabular-nums; }
.del { background: none; border: none; color: var(--accent-red); cursor: pointer; font-size: 12px; }
.empty { padding: 20px; text-align: center; color: var(--text-dim); }
</style>
