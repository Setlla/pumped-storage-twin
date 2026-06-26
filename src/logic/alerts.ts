/**
 * 预警引擎 — 按可配置阈值评估当前态势, 生成预警清单
 * 覆盖: 进度滞后 / 量偏差 / 边坡位移 / 中转场容量 / 弃渣场容量 / 弃方率 / 料源缺口
 */
import type { DeviationResult } from '@/logic/deviation'
import type { AllocationResult } from '@/logic/allocation'

export interface Thresholds {
  progLagMonth: number // 进度滞后(月)
  volDevPct: number // 量偏差(%)
  slopeMm: number // 边坡位移(mm)
  stockPct: number // 中转场使用率(%)
  spoilPct: number // 弃渣场使用率(%)
  spoilRatePct: number // 弃方率(%)
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  progLagMonth: 2, volDevPct: 10, slopeMm: 5, stockPct: 85, spoilPct: 90, spoilRatePct: 30
}

export interface Alert {
  id: string
  level: 'warn' | 'critical'
  category: string
  message: string
  value: string
}

export interface AlertInputs {
  deviation: DeviationResult
  allocation: AllocationResult
  slopeDisp: number
  stockPct: number
  spoilPct: number
}

export function computeAlerts(inp: AlertInputs, th: Thresholds): Alert[] {
  const alerts: Alert[] = []

  // 进度滞后 / 量偏差(按工区)
  inp.deviation.rows.forEach((r) => {
    if (-r.progDevMonth >= th.progLagMonth) {
      alerts.push({
        id: `prog-${r.id}`, level: -r.progDevMonth >= th.progLagMonth + 1 ? 'critical' : 'warn',
        category: '进度滞后', message: `${r.name} 实际进度滞后设计 ${Math.abs(r.progDevMonth)} 个月`,
        value: `${r.progDevMonth} 月`
      })
    }
    if (Math.abs(r.volDevPct) >= th.volDevPct) {
      alerts.push({
        id: `vol-${r.id}`, level: 'warn', category: '量偏差',
        message: `${r.name} 实测方量较设计偏差 ${r.volDevPct > 0 ? '偏多' : '偏少'} ${Math.abs(r.volDevPct)}%`,
        value: `${r.volDevPct > 0 ? '+' : ''}${r.volDevPct}%`
      })
    }
  })

  // 边坡位移
  if (inp.slopeDisp >= th.slopeMm) {
    alerts.push({ id: 'slope', level: 'critical', category: '安全监测', message: `高边坡位移 ${inp.slopeDisp}mm 超阈值 ${th.slopeMm}mm`, value: `${inp.slopeDisp}mm` })
  }
  // 容量
  if (inp.stockPct >= th.stockPct) {
    alerts.push({ id: 'stock', level: 'warn', category: '容量超限', message: `中转料场使用率 ${inp.stockPct.toFixed(0)}% 接近上限`, value: `${inp.stockPct.toFixed(0)}%` })
  }
  if (inp.spoilPct >= th.spoilPct) {
    alerts.push({ id: 'spoil', level: 'critical', category: '容量超限', message: `弃渣场使用率 ${inp.spoilPct.toFixed(0)}% 超阈值`, value: `${inp.spoilPct.toFixed(0)}%` })
  }
  // 弃方率
  if (inp.allocation.kpi.spoilRate >= th.spoilRatePct) {
    alerts.push({ id: 'spoilrate', level: 'warn', category: '料源利用', message: `弃方率 ${inp.allocation.kpi.spoilRate}% 偏高, 建议复核可利用料去向`, value: `${inp.allocation.kpi.spoilRate}%` })
  }
  // 料源缺口(外购)
  if (inp.allocation.kpi.borrowM3 > 0) {
    alerts.push({ id: 'borrow', level: 'warn', category: '供需失衡', message: `存在料源缺口, 需外购/加工 ${inp.allocation.kpi.borrowM3} 万m³`, value: `${inp.allocation.kpi.borrowM3} 万m³` })
  }
  return alerts
}
