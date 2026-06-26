/**
 * 设计参考模型 vs 施工实测模型 — 偏差分析
 *
 * 设计模型：设计资料/土石方平衡规划给定的方量与计划进度。
 * 实测模型：现场揭露/无人机测量/称重运输得到的实际方量与实际进度。
 * 偏差模型：两者对比，识别量偏差、进度偏差、可用料缺口。
 *
 * 当前"实测"为基于设计的合理推演（确定性扰动），待接入真实测量/称重数据后替换。
 */
import { zoneProgressAt, type CutZone, type FillZone } from '@/data/construction'

// 稳定哈希 → [0,1)
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10000) / 10000
}

export interface DeviationRow {
  id: string
  name: string
  kind: '开挖' | '填筑'
  designM3: number
  actualM3: number
  volDevPct: number // 量偏差 %(实测-设计)/设计
  designProgress: number // 0~1
  actualProgress: number
  progDevMonth: number // 进度偏差(月, 负=滞后)
  status: 'ok' | 'warn' | 'crit'
}

export interface DeviationResult {
  rows: DeviationRow[]
  totalDesign: number
  totalActual: number
  totalVolDevPct: number
  avgProgDevMonth: number
  laggingCount: number
}

function rowFor(
  z: { id: string; name: string; planM3: number; startMonth: number; durMonth: number },
  kind: '开挖' | '填筑', month: number
): DeviationRow {
  const h1 = hash01(z.id + 'v')
  const h2 = hash01(z.id + 'p')
  const volDev = (h1 - 0.5) * 0.25 // ±12.5%
  const slip = Math.round((h2 - 0.55) * 8) // 偏向滞后, ±4 月
  const designM3 = z.planM3
  const actualM3 = +(designM3 * (1 + volDev)).toFixed(0)
  const designProgress = zoneProgressAt(z, month)
  const actualProgress = zoneProgressAt({ startMonth: z.startMonth - slip, durMonth: z.durMonth }, month)
  const progDevMonth = -slip // slip>0 表示实际开工晚 → 滞后
  const absSlip = Math.abs(progDevMonth)
  const status: DeviationRow['status'] =
    absSlip >= 3 || Math.abs(volDev) > 0.1 ? 'crit' : absSlip >= 1.5 || Math.abs(volDev) > 0.06 ? 'warn' : 'ok'
  return {
    id: z.id, name: z.name, kind, designM3, actualM3,
    volDevPct: +(volDev * 100).toFixed(1),
    designProgress, actualProgress, progDevMonth, status
  }
}

export function computeDeviation(
  cuts: CutZone[], fills: FillZone[], month: number
): DeviationResult {
  const rows: DeviationRow[] = [
    ...cuts.map((z) => rowFor(z, '开挖', month)),
    ...fills.map((z) => rowFor(z, '填筑', month))
  ]
  const totalDesign = rows.reduce((a, r) => a + r.designM3, 0)
  const totalActual = rows.reduce((a, r) => a + r.actualM3, 0)
  const laggingCount = rows.filter((r) => r.progDevMonth < -1).length
  const avgProgDevMonth = +(rows.reduce((a, r) => a + r.progDevMonth, 0) / rows.length).toFixed(1)
  return {
    rows,
    totalDesign,
    totalActual,
    totalVolDevPct: +(((totalActual - totalDesign) / totalDesign) * 100).toFixed(1),
    avgProgDevMonth,
    laggingCount
  }
}
