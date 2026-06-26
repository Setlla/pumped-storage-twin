<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { useAlertStore } from '@/stores/alerts'
import { computeDeviation } from '@/logic/deviation'
import { computeAllocation } from '@/logic/allocation'
import { computeAlerts, type Thresholds } from '@/logic/alerts'
import { ElMessageBox, ElMessage } from 'element-plus'
import '@/styles/panel.css'

const c = useConstructionStore()
const a = useAlertStore()

const alerts = computed(() => {
  const deviation = computeDeviation(c.cutZones, c.fillZones, c.currentMonth)
  const allocation = computeAllocation(c.cutZones, c.fillZones)
  return computeAlerts(
    { deviation, allocation, slopeDisp: c.slopeDisp, stockPct: c.stockPct, spoilPct: c.spoilPct },
    a.thresholds
  )
})
const active = computed(() => alerts.value.filter((x) => !a.handled[x.id]))
const closed = computed(() => alerts.value.filter((x) => a.handled[x.id]))

const thDefs: { key: keyof Thresholds; label: string; unit: string }[] = [
  { key: 'progLagMonth', label: '进度滞后', unit: '月' },
  { key: 'volDevPct', label: '量偏差', unit: '%' },
  { key: 'slopeMm', label: '边坡位移', unit: 'mm' },
  { key: 'stockPct', label: '中转场使用率', unit: '%' },
  { key: 'spoilPct', label: '弃渣场使用率', unit: '%' },
  { key: 'spoilRatePct', label: '弃方率', unit: '%' }
]

async function handle(id: string) {
  try {
    const { value } = await ElMessageBox.prompt('请填写处置措施 / 说明', '处置预警', {
      confirmButtonText: '确认处置', cancelButtonText: '取消', inputPlaceholder: '如：已调整工序 / 已通知分包 / 已增设中转场…'
    })
    a.close(id, value || '已处置')
    ElMessage.success('预警已处置关闭')
  } catch { /* cancelled */ }
}
</script>

<template>
  <div class="ac-wrap">
    <!-- 阈值配置 -->
    <section class="panel th-panel">
      <div class="panel-header">
        <span class="panel-title">预警阈值配置</span>
        <button class="mini" @click="a.resetThresholds()">恢复默认</button>
      </div>
      <div class="th-grid">
        <div v-for="t in thDefs" :key="t.key" class="th-item">
          <label>{{ t.label }}</label>
          <div class="th-input">
            <input type="number" :value="a.thresholds[t.key]"
              @input="(e: any) => a.setThreshold(t.key, Number(e.target.value))" />
            <span>{{ t.unit }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="lists">
      <!-- 活动预警 -->
      <section class="panel">
        <div class="panel-header">
          <span class="panel-title">活动预警</span>
          <span class="cnt crit">{{ active.length }}</span>
        </div>
        <div class="alist">
          <div v-if="active.length === 0" class="empty">✓ 当前无活动预警</div>
          <div v-for="al in active" :key="al.id" class="arow" :class="al.level">
            <span class="lv">{{ al.level === 'critical' ? '严重' : '预警' }}</span>
            <div class="amain">
              <div class="acat">{{ al.category }} · <b>{{ al.value }}</b></div>
              <div class="amsg">{{ al.message }}</div>
            </div>
            <button class="handle" @click="handle(al.id)">处置</button>
          </div>
        </div>
      </section>

      <!-- 已处置 -->
      <section class="panel">
        <div class="panel-header">
          <span class="panel-title">已处置</span>
          <span class="cnt">{{ closed.length }}</span>
        </div>
        <div class="alist">
          <div v-if="closed.length === 0" class="empty">暂无</div>
          <div v-for="al in closed" :key="al.id" class="arow done">
            <span class="lv done">已闭环</span>
            <div class="amain">
              <div class="acat">{{ al.category }} · {{ al.message }}</div>
              <div class="amsg note">处置：{{ a.handled[al.id].note }}</div>
            </div>
            <button class="handle ghost" @click="a.reopen(al.id)">重开</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ac-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #061222; overflow: hidden; }
.th-panel { flex-shrink: 0; }
.mini { font-size: 11px; padding: 3px 10px; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.th-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; padding: 12px; }
.th-item label { font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; }
.th-input { display: flex; align-items: center; gap: 4px; }
.th-input input { width: 100%; background: rgba(0,30,60,0.4); border: 1px solid var(--border-line); border-radius: 4px; color: var(--text-primary); padding: 5px 7px; font-size: 13px; }
.th-input span { font-size: 11px; color: var(--text-dim); }
.lists { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-height: 0; }
.panel { display: flex; flex-direction: column; min-height: 0; }
.cnt { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
.cnt.crit { color: var(--accent-red); }
.alist { overflow: auto; flex: 1; padding: 8px 12px; display: flex; flex-direction: column; gap: 7px; }
.empty { color: var(--text-dim); text-align: center; padding: 24px; }
.arow { display: flex; gap: 9px; align-items: flex-start; padding: 9px; border-radius: 5px; border-left: 3px solid; }
.arow.warn { border-color: var(--accent-orange); background: rgba(255,157,0,0.06); }
.arow.critical { border-color: var(--accent-red); background: rgba(255,56,96,0.07); }
.arow.done { border-color: var(--text-dim); background: rgba(255,255,255,0.02); }
.lv { font-size: 10px; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; white-space: nowrap; }
.arow.warn .lv { background: rgba(255,157,0,0.2); color: var(--accent-orange); }
.arow.critical .lv { background: rgba(255,56,96,0.2); color: var(--accent-red); }
.lv.done { background: rgba(0,255,136,0.15); color: var(--accent-green); }
.amain { flex: 1; min-width: 0; }
.acat { font-size: 12px; color: var(--text-secondary); }
.acat b { color: var(--text-primary); }
.amsg { font-size: 12px; color: var(--text-primary); margin-top: 2px; line-height: 1.4; }
.amsg.note { color: var(--text-secondary); font-size: 11px; }
.handle { flex-shrink: 0; font-size: 11px; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--accent-cyan); background: transparent; color: var(--accent-cyan); cursor: pointer; }
.handle.ghost { border-color: var(--border-line); color: var(--text-secondary); }
</style>
