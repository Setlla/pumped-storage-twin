/**
 * 土石方调配算法（规则型、可解释）
 *
 * 输入：开挖供给（含料质/时间/可利用率）+ 填筑需求（含料质要求/时间）
 *       + 运距 + 容量 + 运输参数
 * 输出：分来源-去向的调配建议（直接上坝/经中转/外借/弃渣）+ 车次/成本估算
 *       + 冲突预警（时间错配/料质不匹配/缺口）+ KPI
 *
 * 定位：辅助决策与方案复核，可人工确认；非黑盒自动调度。
 */
import {
  CUT_ZONES, FILL_ZONES, CUT_MATERIAL, FILL_ACCEPT,
  haulDistance, HAUL_PARAMS, MATERIAL_LABEL, type Material
} from '@/data/construction'

export type HaulMode = 'direct' | 'stockpile' | 'spoil' | 'borrow'

export interface Allocation {
  from: string
  fromName: string
  to: string
  toName: string
  material: Material
  m3: number // 万 m³
  mode: HaulMode
  distanceKm: number
  trips: number // 车次
  costWan: number // 万元
  reason: string
}

export interface Warning {
  level: 'warn' | 'critical'
  text: string
}

export interface AllocationResult {
  allocations: Allocation[]
  warnings: Warning[]
  kpi: {
    directRate: number // 直接上坝率 %
    spoilRate: number // 弃方率 %
    avgHaulKm: number // 平均运距 km
    totalTrips: number // 总车次
    totalCostWan: number // 总成本(万元)
    borrowM3: number // 外购/加工料
    stockpileM3: number // 经中转量
  }
}

function trips(m3Wan: number): number {
  return Math.round((m3Wan * 1e4) / P.cap)
}
function cost(m3Wan: number, km: number): number {
  return +((trips(m3Wan) * km * P.unit) / 1e4).toFixed(1)
}

// 可配置运输参数(由调配引擎入参覆盖)
let P = { cap: HAUL_PARAMS.truckCapacityM3, unit: HAUL_PARAMS.costPerKmPerTrip, lead: 6, strategy: 'distance' as Strategy }

export type Strategy = 'distance' | 'cost' | 'utilization'
export const STRATEGY_LABEL: Record<Strategy, string> = {
  distance: '距离最优', cost: '成本最优', utilization: '利用率最优'
}
export interface AllocParams { truckCapacityM3: number; costPerKmPerTrip: number; stockpileLeadMonth: number; strategy: Strategy }


export function computeAllocation(
  cutZonesIn: typeof CUT_ZONES = CUT_ZONES,
  fillZonesIn: typeof FILL_ZONES = FILL_ZONES,
  params?: Partial<AllocParams>
): AllocationResult {
  P = {
    cap: params?.truckCapacityM3 || HAUL_PARAMS.truckCapacityM3,
    unit: params?.costPerKmPerTrip || HAUL_PARAMS.costPerKmPerTrip,
    lead: params?.stockpileLeadMonth ?? 6,
    strategy: params?.strategy || 'distance'
  }
  const allocations: Allocation[] = []
  const warnings: Warning[] = []

  // 1. 建立可利用供给池(按料质), 不可利用部分直接弃渣
  interface Supply { id: string; name: string; material: Material; avail: number; start: number; end: number }
  const supplies: Supply[] = []
  cutZonesIn.forEach((z) => {
    const usable = z.planM3 * z.usableRate
    const unusable = z.planM3 * (1 - z.usableRate)
    supplies.push({
      id: z.id, name: z.name, material: CUT_MATERIAL[z.id] || 'mixed',
      avail: usable, start: z.startMonth, end: z.startMonth + z.durMonth
    })
    if (unusable > 0.5) {
      const km = haulDistance(z.id, 'spoil')
      allocations.push({
        from: z.id, fromName: z.name, to: 'spoil', toName: '1#弃渣场',
        material: CUT_MATERIAL[z.id] || 'mixed', m3: +unusable.toFixed(0), mode: 'spoil',
        distanceKm: km, trips: trips(unusable), costWan: cost(unusable, km),
        reason: `不可利用料(利用率${(z.usableRate * 100).toFixed(0)}%)就近弃渣`
      })
    }
  })

  // 2. 逐填筑需求(按开工时间排序)分配相容、就近的料源
  const demands = [...fillZonesIn].sort((a, b) => a.startMonth - b.startMonth)
  demands.forEach((d) => {
    const accept = FILL_ACCEPT[d.id] || []
    let need = d.planM3

    if (accept.length === 0) {
      // 需专门加工料 → 料场
      const km = haulDistance('borrow', d.id)
      allocations.push({
        from: 'borrow', fromName: '垫层料加工区', to: d.id, toName: d.name,
        material: 'mixed', m3: +need.toFixed(0), mode: 'borrow',
        distanceKm: km, trips: trips(need), costWan: cost(need, km),
        reason: '垫层/过渡料需专门加工, 由料场供给'
      })
      warnings.push({ level: 'warn', text: `${d.name} 需 ${need.toFixed(0)} 万m³ 专门加工料, 依赖料场加工能力` })
      return
    }

    // 候选料源: 料质相容; 按策略排序
    const cands = supplies.filter((s) => accept.includes(s.material) && s.avail > 0.5)
    cands.sort((a, b) => {
      const da = haulDistance(a.id, d.id), db = haulDistance(b.id, d.id)
      if (P.strategy === 'utilization') return b.avail - a.avail // 优先消化大料源, 降弃方
      if (P.strategy === 'cost') {
        // 成本最优: 规避中转双倍运距(开挖远早于填筑者降权), 再比运距
        const pa = a.end < d.startMonth ? 1 : 0, pb = b.end < d.startMonth ? 1 : 0
        if (pa !== pb) return pa - pb
        return da - db
      }
      return da - db // 距离最优
    })

    for (const s of cands) {
      if (need <= 0.5) break
      const take = Math.min(need, s.avail)
      s.avail -= take
      need -= take
      const km = haulDistance(s.id, d.id)
      // 时间关系判定: 开挖早于填筑较多 → 经中转; 时间重叠 → 直接上坝; 开挖晚于填筑 → 冲突
      let mode: HaulMode = 'direct'
      let reason = `料质相容(${MATERIAL_LABEL[s.material]}), 就近直接上坝`
      if (s.start > d.startMonth + P.lead) {
        mode = 'direct'
        reason = '开挖晚于填筑需求, 存在时间缺口(见预警)'
        warnings.push({ level: 'critical', text: `时间错配: ${s.name}(${s.start}月起)晚于 ${d.name}(${d.startMonth}月起), ${take.toFixed(0)} 万m³ 需调整工序或他源补充` })
      } else if (s.end < d.startMonth) {
        mode = 'stockpile'
        reason = `开挖(${s.start}-${s.end}月)早于填筑(${d.startMonth}月起), 经中转料场错峰堆存后回采上坝`
      }
      const detourKm = mode === 'stockpile'
        ? +(haulDistance(s.id, 'stockpile') + haulDistance('stockpile', d.id)).toFixed(2)
        : km
      allocations.push({
        from: s.id, fromName: s.name, to: d.id, toName: d.name,
        material: s.material, m3: +take.toFixed(0), mode,
        distanceKm: detourKm, trips: trips(take), costWan: cost(take, detourKm), reason
      })
    }

    if (need > 0.5) {
      // 缺口 → 料场补充
      const km = haulDistance('borrow', d.id)
      allocations.push({
        from: 'borrow', fromName: '垫层料加工区', to: d.id, toName: d.name,
        material: 'mixed', m3: +need.toFixed(0), mode: 'borrow',
        distanceKm: km, trips: trips(need), costWan: cost(need, km),
        reason: '相容料源不足, 缺口由料场外购/加工补充'
      })
      warnings.push({ level: 'warn', text: `料源缺口: ${d.name} 尚缺 ${need.toFixed(0)} 万m³ 相容料, 需外购或调整利用率` })
    }
  })

  // 3. 剩余可利用料 → 弃渣(并提示可优化)
  supplies.forEach((s) => {
    if (s.avail > 0.5) {
      const km = haulDistance(s.id, 'spoil')
      allocations.push({
        from: s.id, fromName: s.name, to: 'spoil', toName: '1#弃渣场',
        material: s.material, m3: +s.avail.toFixed(0), mode: 'spoil',
        distanceKm: km, trips: trips(s.avail), costWan: cost(s.avail, km),
        reason: '可利用料富余, 暂无相容填筑需求 → 弃渣(建议复核能否他用)'
      })
      warnings.push({ level: 'warn', text: `可利用料富余: ${s.name} 剩 ${s.avail.toFixed(0)} 万m³(${MATERIAL_LABEL[s.material]})拟弃渣, 建议评估改填它区以降弃方率` })
    }
  })

  // 4. KPI 汇总
  const totalFill = fillZonesIn.reduce((a, z) => a + z.planM3, 0)
  const totalCut = cutZonesIn.reduce((a, z) => a + z.planM3, 0)
  const directVol = allocations.filter((a) => a.mode === 'direct' && a.to !== 'spoil').reduce((a, b) => a + b.m3, 0)
  const stockVol = allocations.filter((a) => a.mode === 'stockpile').reduce((a, b) => a + b.m3, 0)
  const spoilVol = allocations.filter((a) => a.mode === 'spoil').reduce((a, b) => a + b.m3, 0)
  const borrowVol = allocations.filter((a) => a.mode === 'borrow').reduce((a, b) => a + b.m3, 0)
  const totalTrips = allocations.reduce((a, b) => a + b.trips, 0)
  const totalCostWan = +allocations.reduce((a, b) => a + b.costWan, 0).toFixed(0)
  const wAvg = allocations.reduce((a, b) => a + b.distanceKm * b.m3, 0)
  const sumVol = allocations.reduce((a, b) => a + b.m3, 0)

  return {
    allocations,
    warnings,
    kpi: {
      directRate: +(((directVol + stockVol) / totalFill) * 100).toFixed(1),
      spoilRate: +((spoilVol / totalCut) * 100).toFixed(1),
      avgHaulKm: +(sumVol > 0 ? wAvg / sumVol : 0).toFixed(2),
      totalTrips,
      totalCostWan,
      borrowM3: +borrowVol.toFixed(0),
      stockpileM3: +stockVol.toFixed(0)
    }
  }
}
