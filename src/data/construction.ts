/**
 * 建设期数据模型 — 以"土石方平衡"为核心
 *
 * 抽水蓄能建设特点: 上水库库盆、地下厂房洞室群、引水/尾水隧洞开挖
 * 产生巨量石方; 应尽量用于面板堆石坝填筑, 实现"挖填平衡、就地利用、
 * 少弃少借", 降低弃渣占地与外购成本.
 *
 * 数据为典型 1200MW 级抽蓄工程的合理估算(单位: 万 m³), 用于演示.
 */

export interface CutZone {
  id: string
  name: string
  planM3: number // 计划开挖方量(万m³)
  usableRate: number // 可利用率(可作填筑料比例)
  rock: number // 石方占比
  progress: number // 形象进度 0~1
}

export interface FillZone {
  id: string
  name: string
  planM3: number // 计划填筑方量(万m³)
  progress: number
}

/** 开挖区(挖方源) */
export const CUT_ZONES: CutZone[] = [
  { id: 'upper', name: '上水库库盆开挖', planM3: 286, usableRate: 0.82, rock: 0.78, progress: 0.74 },
  { id: 'cavern', name: '地下厂房洞室群', planM3: 96, usableRate: 0.9, rock: 0.97, progress: 0.55 },
  { id: 'tunnel', name: '引水/尾水隧洞', planM3: 124, usableRate: 0.88, rock: 0.95, progress: 0.48 },
  { id: 'lower', name: '下水库库盆开挖', planM3: 152, usableRate: 0.7, rock: 0.6, progress: 0.62 },
  { id: 'road', name: '场内道路及平台', planM3: 58, usableRate: 0.5, rock: 0.4, progress: 0.85 }
]

/** 填筑区(填方去向) */
export const FILL_ZONES: FillZone[] = [
  { id: 'upperDam', name: '上水库面板堆石坝', planM3: 318, progress: 0.58 },
  { id: 'lowerDam', name: '下水库坝/围堰', planM3: 108, progress: 0.66 },
  { id: 'liner', name: '库盆垫层/过渡料', planM3: 42, progress: 0.5 },
  { id: 'subgrade', name: '道路路基/场平', planM3: 72, progress: 0.8 }
]

/** 弃渣场 */
export const SPOIL_YARD = { name: '1#弃渣场', capacityM3: 240, usedM3: 132 }
/** 料场(缺方时补充特殊料) */
export const BORROW_AREA = { name: '垫层料加工区', reserveM3: 80, usedM3: 28 }

export const totalCutPlan = () => CUT_ZONES.reduce((s, z) => s + z.planM3, 0)
export const totalFillPlan = () => FILL_ZONES.reduce((s, z) => s + z.planM3, 0)
/** 可利用方量(开挖料可用于填筑的部分) */
export const usableCutPlan = () =>
  CUT_ZONES.reduce((s, z) => s + z.planM3 * z.usableRate, 0)

/**
 * 调配关系(挖→填/弃, 借→填). 单位万m³, 用于流向图.
 * 体现"时空平衡"的方量调配方案.
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
