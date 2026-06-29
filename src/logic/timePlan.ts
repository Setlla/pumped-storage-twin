/**
 * 分时段调配计划 — 回答"什么时间 · 把哪儿的料 · 搬到哪儿 · 搬多少"
 *
 * 逐季度推进:当期开挖产出 + 中转堆存 → 按料质相容、就近匹配当期填筑需求;
 * 当期用不掉的可利用料进中转(时间解耦),后期再从中转回采上坝;不可利用料弃渣;缺口外购。
 * 这是"时空关系"的直接表达:时间 × (来源→去向) × 方量。
 */
import {
  CUT_MATERIAL, FILL_ACCEPT, haulDistance, monthLabel, zoneProgressAt,
  TOTAL_MONTHS, type CutZone, type FillZone, type Material
} from '@/data/construction'

export type PlanMode = 'direct' | 'to-stock' | 'from-stock' | 'spoil' | 'borrow'
export const PLAN_MODE_LABEL: Record<PlanMode, string> = {
  direct: '直接上坝', 'to-stock': '进中转', 'from-stock': '中转回采', spoil: '弃渣', borrow: '外购'
}

export interface PlanEntry { from: string; to: string; material: Material; vol: number; mode: PlanMode }
export interface Period { idx: number; label: string; mStart: number; mEnd: number; entries: PlanEntry[]; totalVol: number }

const STEP = 3 // 季度
const MIN = 0.3 // 忽略碎量(万m³)

export function timePhasedPlan(cuts: CutZone[], fills: FillZone[]): Period[] {
  const stock: Record<Material, number> = { rock: 0, mixed: 0, soil: 0 }
  const periods: Period[] = []
  let idx = 0
  for (let a = 0; a < TOTAL_MONTHS; a += STEP) {
    const b = Math.min(TOTAL_MONTHS, a + STEP)
    const entries: PlanEntry[] = []

    // 当期开挖产出(可利用) + 不可利用直接弃渣
    const prod = cuts.map((z) => {
      const d = zoneProgressAt(z, b) - zoneProgressAt(z, a)
      const usable = z.planM3 * z.usableRate * d
      const unusable = z.planM3 * (1 - z.usableRate) * d
      if (unusable > MIN) entries.push({ from: z.id, to: 'spoil', material: CUT_MATERIAL[z.id] || 'mixed', vol: unusable, mode: 'spoil' })
      return { id: z.id, material: (CUT_MATERIAL[z.id] || 'mixed') as Material, avail: usable }
    }).filter((p) => p.avail > MIN)

    // 当期填筑需求(按开工排序)
    const demands = fills.map((z) => {
      const d = zoneProgressAt(z, b) - zoneProgressAt(z, a)
      return { id: z.id, accept: FILL_ACCEPT[z.id] || [], need: z.planM3 * d }
    }).filter((d) => d.need > MIN).sort((x, y) => x.need - y.need)

    demands.forEach((dm) => {
      let need = dm.need
      if (dm.accept.length === 0) { // 垫层料→料场
        entries.push({ from: 'borrow', to: dm.id, material: 'mixed', vol: need, mode: 'borrow' }); return
      }
      // 1) 当期开挖直接上坝(相容、就近)
      const cands = prod.filter((p) => dm.accept.includes(p.material) && p.avail > MIN)
        .sort((p1, p2) => haulDistance(p1.id, dm.id) - haulDistance(p2.id, dm.id))
      for (const p of cands) {
        if (need <= MIN) break
        const take = Math.min(need, p.avail); p.avail -= take; need -= take
        entries.push({ from: p.id, to: dm.id, material: p.material, vol: take, mode: 'direct' })
      }
      // 2) 中转回采
      for (const mat of dm.accept) {
        if (need <= MIN) break
        const take = Math.min(need, stock[mat as Material])
        if (take > MIN) { stock[mat as Material] -= take; need -= take; entries.push({ from: 'stockpile', to: dm.id, material: mat as Material, vol: take, mode: 'from-stock' }) }
      }
      // 3) 缺口外购
      if (need > MIN) entries.push({ from: 'borrow', to: dm.id, material: 'mixed', vol: need, mode: 'borrow' })
    })

    // 当期用不掉的可利用料 → 进中转(时间解耦)
    prod.forEach((p) => {
      if (p.avail > MIN) { stock[p.material] += p.avail; entries.push({ from: p.id, to: 'stockpile', material: p.material, vol: p.avail, mode: 'to-stock' }) }
    })

    const merged = mergeEntries(entries)
    const totalVol = merged.reduce((s, e) => s + e.vol, 0)
    if (merged.length) periods.push({ idx: idx++, label: monthLabel(a + 1), mStart: a, mEnd: b, entries: merged, totalVol: +totalVol.toFixed(0) })
  }
  return periods
}

function mergeEntries(list: PlanEntry[]): PlanEntry[] {
  const map = new Map<string, PlanEntry>()
  for (const e of list) {
    const k = `${e.from}|${e.to}|${e.mode}`
    const ex = map.get(k)
    if (ex) ex.vol += e.vol
    else map.set(k, { ...e })
  }
  return [...map.values()].map((e) => ({ ...e, vol: +e.vol.toFixed(1) })).sort((a, b) => b.vol - a.vol)
}
