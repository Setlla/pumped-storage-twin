/**
 * 车辆运输监管 — 运输记录生成 + 称重/抬斗一致性校验
 *
 * 当前为基于在场车辆与路线的样例推演;接入真实 GPS/称重/抬斗识别数据后替换。
 */
import { HAUL_PARAMS } from '@/data/construction'

export interface TripRecord {
  id: string
  time: string
  plate: string
  from: string
  to: string
  material: string
  weightT: number // 称重(吨)
  buckets: number // 抬斗识别次数
  volM3: number // 折算方量
  consistent: boolean // 称重与抬斗是否一致
}

const ROUTES = [
  { from: '上水库库盆', to: '面板堆石坝', mat: '石方/堆石料' },
  { from: '地下厂房', to: '中转料场', mat: '石方/堆石料' },
  { from: '隧洞', to: '下水库坝', mat: '石方/堆石料' },
  { from: '下水库库盆', to: '道路路基', mat: '土石混合料' },
  { from: '开挖区', to: '1#弃渣场', mat: '覆盖层' },
  { from: '中转料场', to: '面板堆石坝', mat: '石方/堆石料' }
]
const DENSITY = 1.9 // t/m³ 松方密度估算

function pad(n: number) { return String(n).padStart(2, '0') }

/** 生成最近 n 条运输记录 */
export function genTrips(plates: string[], n = 40): TripRecord[] {
  const out: TripRecord[] = []
  const now = Date.now()
  for (let i = 0; i < n; i++) {
    const r = ROUTES[Math.floor(Math.random() * ROUTES.length)]
    const plate = plates[Math.floor(Math.random() * plates.length)] || `苏G·T${2300 + i}`
    const cap = HAUL_PARAMS.truckCapacityM3
    const buckets = 4 + Math.floor(Math.random() * 4) // 抬斗次数
    const volBucket = buckets * (cap / 5) // 每斗约 cap/5
    const vol = +(volBucket * (0.92 + Math.random() * 0.16)).toFixed(1)
    const weight = +(vol * DENSITY * (0.96 + Math.random() * 0.08)).toFixed(1)
    // 一致性: 称重折方 vs 抬斗折方 偏差 > 15% 视为异常
    const volByWeight = weight / DENSITY
    const consistent = Math.abs(volByWeight - vol) / vol < 0.15
    const t = new Date(now - i * (3 + Math.random() * 8) * 60000)
    out.push({
      id: 'T' + (now - i),
      time: `${pad(t.getHours())}:${pad(t.getMinutes())}`,
      plate, from: r.from, to: r.to, material: r.mat,
      weightT: weight, buckets, volM3: vol, consistent
    })
  }
  return out
}

export function tripStats(trips: TripRecord[]) {
  const totalVol = trips.reduce((a, t) => a + t.volM3, 0)
  const totalWeight = trips.reduce((a, t) => a + t.weightT, 0)
  const abnormal = trips.filter((t) => !t.consistent).length
  return {
    count: trips.length,
    totalVol: +totalVol.toFixed(0),
    totalWeight: +totalWeight.toFixed(0),
    abnormal
  }
}
