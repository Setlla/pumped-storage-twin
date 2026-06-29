<script setup lang="ts">
import { computed } from 'vue'
import { useAuditStore } from '@/stores/audit'
import { useConstructionStore } from '@/stores/construction'
import { ElMessageBox } from 'element-plus'
import '@/styles/panel.css'

const audit = useAuditStore()
const c = useConstructionStore()

const govInfo = [
  ['数据源', () => c.dataSource],
  ['坐标系', () => 'WGS84 / CGCS2000(施工坐标待对位)'],
  ['编码规则', () => '项目-标段-对象类型-序号(如 PSTS-B1-CUT-001)'],
  ['单位口径', () => '方量 万m³ · 运距 km · 称重 t'],
  ['指标口径', () => '设计量/实测量/直接上坝率/中转量/弃渣量/进度偏差'],
  ['数据版本', () => 'v1.0(' + (c.dataSource === '导入数据' ? '导入' : '内置示例') + ')']
] as [string, () => string][]

function fmt(ts: number) {
  const d = new Date(ts); const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
async function clearLog() {
  try { await ElMessageBox.confirm('确认清空操作日志?', '提示', { type: 'warning' }); audit.clear() } catch {}
}
</script>

<template>
  <div class="gv-wrap">
    <section class="panel">
      <div class="panel-header"><span class="panel-title">数据治理 · 口径与标准(一底座)</span></div>
      <div class="gv-grid">
        <div v-for="row in govInfo" :key="row[0]" class="gv-item">
          <label>{{ row[0] }}</label>
          <span>{{ row[1]() }}</span>
        </div>
      </div>
    </section>

    <section class="panel log-panel">
      <div class="panel-header">
        <span class="panel-title">操作审计日志</span>
        <div class="hd-right">
          <span class="metric-label">{{ audit.entries.length }} 条</span>
          <button class="mini" @click="clearLog">清空</button>
        </div>
      </div>
      <div class="tbl-scroll">
        <table>
          <thead><tr><th>时间</th><th>操作</th><th>详情</th></tr></thead>
          <tbody>
            <tr v-for="e in audit.entries" :key="e.id">
              <td class="t">{{ fmt(e.ts) }}</td><td>{{ e.action }}</td><td class="d">{{ e.detail }}</td>
            </tr>
            <tr v-if="audit.entries.length === 0"><td colspan="3" class="empty">暂无操作记录</td></tr>
          </tbody>
        </table>
      </div>
      <div class="gv-note">关键操作(导入/调配方案/预警处置/资料编辑/后端同步)自动留痕,支撑可追溯。</div>
    </section>
  </div>
</template>

<style scoped>
.gv-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #061222; overflow: hidden; }
.panel { display: flex; flex-direction: column; min-height: 0; }
.gv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px; }
.gv-item { display: flex; flex-direction: column; gap: 3px; }
.gv-item label { font-size: 11px; color: var(--text-secondary); }
.gv-item span { font-size: 13px; color: var(--text-primary); }
.log-panel { flex: 1; }
.hd-right { display: flex; align-items: center; gap: 10px; }
.mini { font-size: 11px; padding: 3px 10px; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.tbl-scroll { overflow: auto; flex: 1; padding: 0 4px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { position: sticky; top: 0; background: var(--bg-panel-strong); color: var(--text-secondary); font-weight: 500; text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--border-line); }
tbody td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.t { color: var(--text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
tbody td.d { color: var(--text-secondary); }
.empty { text-align: center; color: var(--text-dim); padding: 20px; }
.gv-note { font-size: 11px; color: var(--text-secondary); padding: 8px 12px; border-top: 1px solid var(--border-line); }
</style>
