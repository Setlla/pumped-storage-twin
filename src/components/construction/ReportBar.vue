<script setup lang="ts">
import { useConstructionStore } from '@/stores/construction'
import { useAlertStore } from '@/stores/alerts'
import { computeDeviation } from '@/logic/deviation'
import { computeAllocation } from '@/logic/allocation'
import { computeAlerts } from '@/logic/alerts'
import { exportReport } from '@/logic/report'
import { ElMessage } from 'element-plus'

const c = useConstructionStore()
const a = useAlertStore()

function gen(type: '日报' | '周报' | '阶段报表') {
  const deviation = computeDeviation(c.cutZones, c.fillZones, c.currentMonth)
  const allocation = computeAllocation(c.cutZones, c.fillZones)
  const alerts = computeAlerts(
    { deviation, allocation, slopeDisp: c.slopeDisp, stockPct: c.stockPct, spoilPct: c.spoilPct },
    a.thresholds
  ).filter((x) => !a.handled[x.id])
  exportReport({
    type, monthText: c.monthText, dataSource: c.dataSource,
    overallProgress: c.overallProgress, balanceRate: c.balanceRate,
    cutPlan: c.cutPlan, fillPlan: c.fillPlan, usablePlan: c.usablePlan,
    surplus: c.surplus, utilizationRate: c.utilizationRate,
    stockNow: c.stockNow, spoilUsed: c.spoilUsed,
    deviation, allocation, alerts
  })
  ElMessage.success(`已导出${type}（Excel）`)
}
</script>

<template>
  <div class="rep-bar">
    <span class="lbl">报表导出</span>
    <div class="btns">
      <button class="rb" @click="gen('日报')">日报</button>
      <button class="rb" @click="gen('周报')">周报</button>
      <button class="rb primary" @click="gen('阶段报表')">阶段报表</button>
    </div>
  </div>
</template>

<style scoped>
.rep-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; }
.lbl { font-size: 12px; color: var(--text-secondary); }
.btns { margin-left: auto; display: flex; gap: 6px; }
.rb { padding: 5px 12px; font-size: 12px; cursor: pointer; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); }
.rb:hover { color: var(--text-primary); border-color: var(--border-line-strong); }
.rb.primary { color: #061222; font-weight: 600; border-color: var(--accent-green); background: linear-gradient(135deg, var(--accent-green), #00b36b); }
</style>
