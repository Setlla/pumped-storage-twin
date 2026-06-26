/**
 * 报表导出（一表）— 日报 / 周报 / 阶段报表，多 Sheet Excel
 */
import * as XLSX from 'xlsx'
import type { DeviationResult } from '@/logic/deviation'
import type { AllocationResult } from '@/logic/allocation'
import type { Alert } from '@/logic/alerts'

export interface ReportCtx {
  type: '日报' | '周报' | '阶段报表'
  monthText: string
  dataSource: string
  overallProgress: number
  balanceRate: number
  cutPlan: number
  fillPlan: number
  usablePlan: number
  surplus: number
  utilizationRate: number
  stockNow: number
  spoilUsed: number
  deviation: DeviationResult
  allocation: AllocationResult
  alerts: Alert[]
}

function sheet(wb: XLSX.WorkBook, name: string, rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = (rows[0] || []).map(() => ({ wch: 18 }))
  XLSX.utils.book_append_sheet(wb, ws, name)
}

export function exportReport(ctx: ReportCtx) {
  const wb = XLSX.utils.book_new()
  const now = new Date().toLocaleString('zh-CN')

  sheet(wb, '项目概况', [
    ['江苏连云港抽水蓄能电站 · 土石方平衡' + ctx.type],
    ['生成时间', now],
    ['数据源', ctx.dataSource],
    ['统计截至', ctx.monthText],
    ['总体形象进度', ctx.overallProgress.toFixed(1) + '%'],
    ['挖填平衡率', ctx.balanceRate.toFixed(0) + '%'],
    ['开挖料综合利用率', ctx.utilizationRate.toFixed(1) + '%']
  ])

  sheet(wb, '土石方平衡', [
    ['指标', '数值', '单位'],
    ['总开挖', ctx.cutPlan.toFixed(0), '万m³'],
    ['总填筑', ctx.fillPlan.toFixed(0), '万m³'],
    ['可利用方', ctx.usablePlan.toFixed(0), '万m³'],
    ['余方(弃渣)', ctx.surplus.toFixed(0), '万m³'],
    ['当前中转堆存', ctx.stockNow.toFixed(0), '万m³'],
    ['累计弃渣', ctx.spoilUsed.toFixed(0), '万m³']
  ])

  const devRows: (string | number)[][] = [['工区', '类型', '设计量', '实测量', '量偏差%', '设计进度%', '实际进度%', '进度偏差(月)', '状态']]
  ctx.deviation.rows.forEach((r) =>
    devRows.push([r.name, r.kind, r.designM3, r.actualM3, r.volDevPct, +(r.designProgress * 100).toFixed(0), +(r.actualProgress * 100).toFixed(0), r.progDevMonth, r.status === 'ok' ? '正常' : r.status === 'warn' ? '关注' : '偏差大'])
  )
  sheet(wb, '设计vs实测偏差', devRows)

  const k = ctx.allocation.kpi
  const allocRows: (string | number)[][] = [
    ['调配KPI', ''],
    ['直接上坝率', k.directRate + '%'], ['弃方率', k.spoilRate + '%'],
    ['平均运距', k.avgHaulKm + 'km'], ['总车次', k.totalTrips], ['运输成本估算', k.totalCostWan + '万元'],
    [''], ['来源', '去向', '方式', '方量(万m³)', '运距(km)', '车次', '成本(万元)', '说明']
  ]
  const modeMap: Record<string, string> = { direct: '直接上坝', stockpile: '经中转', spoil: '弃渣', borrow: '外购' }
  ctx.allocation.allocations.forEach((al) =>
    allocRows.push([al.fromName, al.toName, modeMap[al.mode], al.m3, al.distanceKm, al.trips, al.costWan, al.reason])
  )
  sheet(wb, '调配方案', allocRows)

  const alertRows: (string | number)[][] = [['级别', '类别', '数值', '内容']]
  ctx.alerts.forEach((al) => alertRows.push([al.level === 'critical' ? '严重' : '预警', al.category, al.value, al.message]))
  if (ctx.alerts.length === 0) alertRows.push(['—', '—', '—', '当前无活动预警'])
  sheet(wb, '预警清单', alertRows)

  const fname = `连云港抽蓄_土石方${ctx.type}_${ctx.monthText}.xlsx`
  XLSX.writeFile(wb, fname)
}
