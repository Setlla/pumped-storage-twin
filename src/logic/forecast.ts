/**
 * 进度优化 · 时空缺口预判
 * 基于逐月时空平衡序列,向前预判:中转场超容、料源缺口、弃渣场超容等风险,并给建议。
 */
import { CUT_ZONES, zoneProgressAt, STOCKPILE, SPOIL_YARD, type MonthPoint } from '@/data/construction'

export interface ForecastRisk {
  month: number
  type: string
  level: 'warn' | 'critical'
  value: string
  suggest: string
}

export interface ForecastRow {
  month: number
  cumCut: number
  cumFill: number
  stock: number
  spoil: number
  status: 'ok' | 'warn' | 'crit'
}

function spoilAt(month: number): number {
  return CUT_ZONES.reduce((s, z) => s + z.planM3 * (1 - z.usableRate) * zoneProgressAt(z, month), 0)
}

export interface ForecastResult {
  rows: ForecastRow[]
  risks: ForecastRisk[]
  peakStock: number
  peakStockMonth: number
}

export function computeForecast(series: MonthPoint[], currentMonth: number): ForecastResult {
  const stockCap = STOCKPILE.capacityM3
  const spoilCap = SPOIL_YARD.capacityM3
  const cur = Math.round(currentMonth)

  // 采样点:当前 / +3 / +6 / +12 / +18 / 末期
  const offsets = [0, 3, 6, 12, 18]
  const sampleMonths = offsets.map((o) => Math.min(series.length, cur + o)).filter((m) => m >= 1)
  if (!sampleMonths.includes(series.length)) sampleMonths.push(series.length)

  const rows: ForecastRow[] = sampleMonths.map((m) => {
    const p = series[Math.max(0, Math.min(series.length - 1, m - 1))]
    const spoil = spoilAt(m)
    let status: ForecastRow['status'] = 'ok'
    if (p.stock > stockCap || spoil > spoilCap || p.cumFill > p.cumCut) status = 'crit'
    else if (p.stock > stockCap * 0.85 || spoil > spoilCap * 0.85) status = 'warn'
    return { month: m, cumCut: +p.cumCut.toFixed(0), cumFill: +p.cumFill.toFixed(0), stock: +p.stock.toFixed(0), spoil: +spoil.toFixed(0), status }
  })

  // 风险(只看当前及以后)
  const risks: ForecastRisk[] = []
  let peakStock = 0, peakStockMonth = cur
  const future = series.filter((p) => p.month >= cur)
  future.forEach((p) => { if (p.stock > peakStock) { peakStock = p.stock; peakStockMonth = p.month } })

  const overStockM = future.find((p) => p.stock > stockCap)
  if (overStockM) risks.push({ month: overStockM.month, type: '中转场超容', level: 'critical', value: `${overStockM.stock.toFixed(0)}/${stockCap} 万m³`, suggest: '增设/扩容中转料场,或提前回采上坝、调整开挖节奏' })
  else if (peakStock > stockCap * 0.85) risks.push({ month: peakStockMonth, type: '中转场临界', level: 'warn', value: `峰值 ${peakStock.toFixed(0)}/${stockCap} 万m³`, suggest: '关注中转堆存峰值,预留缓冲或错峰回采' })

  const deficitM = future.find((p) => p.cumFill > p.cumCut + 1)
  if (deficitM) risks.push({ month: deficitM.month, type: '料源缺口', level: 'critical', value: `缺 ${(deficitM.cumFill - deficitM.cumCut).toFixed(0)} 万m³`, suggest: '提前开挖供料、料场补充或调整填筑计划' })

  const overSpoilM = sampleMonths.map((m) => ({ m, s: spoilAt(m) })).find((x) => x.s > spoilCap)
  if (overSpoilM) risks.push({ month: overSpoilM.m, type: '弃渣场超容', level: 'critical', value: `${overSpoilM.s.toFixed(0)}/${spoilCap} 万m³`, suggest: '新增弃渣场容量,或提高开挖料利用率降弃方' })

  if (risks.length === 0) risks.push({ month: cur, type: '总体平衡', level: 'warn', value: '无显著超限', suggest: '当前计划下未来时空平衡可控,持续滚动跟踪' })

  return { rows, risks, peakStock: +peakStock.toFixed(0), peakStockMonth }
}
