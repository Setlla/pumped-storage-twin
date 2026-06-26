/**
 * 建设期数据模型 — 以"土石方平衡(时空平衡)"为核心
 *
 * 时空平衡内涵: 开挖与填筑在时间上错配——上水库/洞室开挖早期即产出
 * 大量石方, 而面板堆石坝填筑要到中后期才形成需求, 中间差额需临时堆存
 * (中转料场); 后期再回采填坝. 数字孪生要把"何时挖、何时填、堆存多少"
 * 的时间演化显性化.
 *
 * 数据为典型 1200MW 级抽蓄工程的合理估算(单位: 万 m³), 用于演示.
 */

export const TOTAL_MONTHS = 84 // 建设周期 7 年
export const START_YEAR = 2023
export const START_MONTH = 6 // 2023-06 开工

export interface CutZone {
  id: string
  name: string
  planM3: number // 计划开挖方量(万m³)
  usableRate: number // 可利用率(可作填筑料比例)
  rock: number // 石方占比
  startMonth: number // 开工月(自开工起)
  durMonth: number // 工期(月)
}

export interface FillZone {
  id: string
  name: string
  planM3: number
  startMonth: number
  durMonth: number
}

/** 开挖区(挖方源) — 含时间计划 */
export const CUT_ZONES: CutZone[] = [
  { id: 'road', name: '场内道路及平台', planM3: 58, usableRate: 0.5, rock: 0.4, startMonth: 0, durMonth: 18 },
  { id: 'upper', name: '上水库库盆开挖', planM3: 286, usableRate: 0.82, rock: 0.78, startMonth: 6, durMonth: 42 },
  { id: 'lower', name: '下水库库盆开挖', planM3: 152, usableRate: 0.7, rock: 0.6, startMonth: 10, durMonth: 36 },
  { id: 'cavern', name: '地下厂房洞室群', planM3: 96, usableRate: 0.9, rock: 0.97, startMonth: 12, durMonth: 40 },
  { id: 'tunnel', name: '引水/尾水隧洞', planM3: 124, usableRate: 0.88, rock: 0.95, startMonth: 18, durMonth: 42 }
]

/** 填筑区(填方去向) — 含时间计划 */
export const FILL_ZONES: FillZone[] = [
  { id: 'subgrade', name: '道路路基/场平', planM3: 72, startMonth: 4, durMonth: 20 },
  { id: 'lowerDam', name: '下水库坝/围堰', planM3: 108, startMonth: 16, durMonth: 30 },
  { id: 'upperDam', name: '上水库面板堆石坝', planM3: 318, startMonth: 24, durMonth: 42 },
  { id: 'liner', name: '库盆垫层/过渡料', planM3: 42, startMonth: 44, durMonth: 24 }
]

/** 弃渣场 / 中转堆存 / 料场 */
export const SPOIL_YARD = { name: '1#弃渣场', capacityM3: 240 }
export const STOCKPILE = { name: '中转料场(临时堆存)', capacityM3: 180 }
export const BORROW_AREA = { name: '垫层料加工区', reserveM3: 80 }

export const totalCutPlan = () => CUT_ZONES.reduce((s, z) => s + z.planM3, 0)
export const totalFillPlan = () => FILL_ZONES.reduce((s, z) => s + z.planM3, 0)
export const usableCutPlan = () =>
  CUT_ZONES.reduce((s, z) => s + z.planM3 * z.usableRate, 0)

/** 平滑 S 曲线(smoothstep) */
function smooth(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

/** 某工区在第 month 月的累计完成比例 0~1 */
export function zoneProgressAt(z: { startMonth: number; durMonth: number }, month: number): number {
  return smooth((month - z.startMonth) / z.durMonth)
}

/** 当前月日期标签 */
export function monthLabel(month: number): string {
  const total = START_MONTH - 1 + Math.floor(month)
  const y = START_YEAR + Math.floor(total / 12)
  const m = (total % 12) + 1
  return `${y}.${String(m).padStart(2, '0')}`
}

export interface MonthPoint {
  month: number
  cut: number // 当月开挖(可利用)
  fill: number // 当月填筑需求
  cumCut: number // 累计可利用开挖
  cumFill: number // 累计填筑
  stock: number // 累计堆存(cumCut-cumFill, 体现时空错配)
}

/** 预计算逐月时空平衡序列 */
export function buildMonthlySeries(
  cuts: CutZone[] = CUT_ZONES,
  fills: FillZone[] = FILL_ZONES
): MonthPoint[] {
  const pts: MonthPoint[] = []
  let cumCut = 0
  let cumFill = 0
  for (let m = 1; m <= TOTAL_MONTHS; m++) {
    let cut = 0
    let fill = 0
    cuts.forEach((z) => {
      const d = zoneProgressAt(z, m) - zoneProgressAt(z, m - 1)
      cut += z.planM3 * z.usableRate * d
    })
    fills.forEach((z) => {
      const d = zoneProgressAt(z, m) - zoneProgressAt(z, m - 1)
      fill += z.planM3 * d
    })
    cumCut += cut
    cumFill += fill
    pts.push({ month: m, cut, fill, cumCut, cumFill, stock: Math.max(0, cumCut - cumFill) })
  }
  return pts
}


/**
 * 调配关系(挖→填/弃, 借→填). 单位万m³, 用于调配流向图.
 */
export const HAUL_PLAN: { from: string; to: string; m3: number }[] = [
  { from: 'upper', to: 'upperDam', m3: 198 },
  { from: 'upper', to: 'spoil', m3: 52 },
  { from: 'cavern', to: 'upperDam', m3: 78 },
  { from: 'tunnel', to: 'upperDam', m3: 42 },
  { from: 'tunnel', to: 'lowerDam', m3: 66 },
  { from: 'lower', to: 'lowerDam', m3: 42 },
  { from: 'lower', to: 'subgrade', m3: 48 },
  { from: 'lower', to: 'spoil', m3: 46 },
  { from: 'road', to: 'subgrade', m3: 24 },
  { from: 'road', to: 'spoil', m3: 30 },
  { from: 'borrow', to: 'liner', m3: 42 }
]


/** 料质类型 */
export type Material = 'rock' | 'mixed' | 'soil'
export const MATERIAL_LABEL: Record<Material, string> = {
  rock: '石方/堆石料', mixed: '土石混合料', soil: '土方/覆盖层'
}

/** 各开挖区产出料质 */
export const CUT_MATERIAL: Record<string, Material> = {
  upper: 'rock', cavern: 'rock', tunnel: 'rock', lower: 'mixed', road: 'soil'
}

/** 各填筑区可接收料质(料质相容/禁配规则) */
export const FILL_ACCEPT: Record<string, Material[]> = {
  upperDam: ['rock'], // 面板堆石坝主体, 仅收石方
  lowerDam: ['rock', 'mixed'],
  subgrade: ['soil', 'mixed', 'rock'], // 路基场平, 较宽松
  liner: [] // 垫层/过渡料需专门加工, 不收原状开挖料 → 走料场
}

/** 平面位置(相对坐标, 米), 用于运距测算 */
export const ZONE_POS: Record<string, [number, number]> = {
  // 开挖区
  upper: [-200, 600], cavern: [0, 120], tunnel: [-60, 320], lower: [120, -420], road: [220, 20],
  // 填筑区
  upperDam: [-200, 500], lowerDam: [110, -360], subgrade: [220, 60], liner: [-185, 470],
  // 场地
  stockpile: [-110, 360], spoil: [-420, 220], borrow: [320, 110]
}

/** 两点运距(km) */
export function haulDistance(a: string, b: string): number {
  const pa = ZONE_POS[a], pb = ZONE_POS[b]
  if (!pa || !pb) return 1
  const d = Math.sqrt((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2)
  return +(d / 1000).toFixed(2) // 米→km
}

/** 运输/成本参数 */
export const HAUL_PARAMS = {
  truckCapacityM3: 25, // 单车方量
  costPerKmPerTrip: 8 // 元/车·km(含油耗/人工等综合)
}
