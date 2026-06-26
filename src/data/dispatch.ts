/**
 * 24 小时电网负荷 / 电价 / 调度计划
 *
 * 抽水蓄能的核心价值: 削峰填谷
 * - 低谷时段(夜间): 电价低 → 抽水蓄能(消耗电网富余电力)
 * - 高峰时段(早晚高峰): 电价高 → 发电(向电网送电)
 *
 * 数据为典型华东电网日负荷特性的简化建模,用于演示.
 */

export type DispatchMode = 'pump' | 'generate' | 'idle'

/** 电网相对负荷率 0~1 (24 个整点) */
export const GRID_LOAD: number[] = [
  0.42, 0.38, 0.35, 0.34, 0.36, 0.42, // 0-5 深夜低谷
  0.55, 0.70, 0.85, 0.92, 0.95, 0.93, // 6-11 早高峰
  0.88, 0.86, 0.84, 0.85, 0.90, 0.96, // 12-17 午间
  1.0, 0.98, 0.88, 0.74, 0.60, 0.50  // 18-23 晚高峰至回落
]

/** 分时电价 (元/kWh) */
export const PRICE: number[] = [
  0.30, 0.30, 0.30, 0.30, 0.30, 0.30,
  0.55, 0.82, 1.15, 1.15, 1.15, 0.82,
  0.82, 0.82, 0.82, 0.82, 0.82, 1.15,
  1.32, 1.32, 1.15, 0.82, 0.55, 0.30
]

/** 时段类型: valley 谷 / flat 平 / peak 峰 / sharp 尖峰 */
export function priceTier(hour: number): 'valley' | 'flat' | 'peak' | 'sharp' {
  const p = PRICE[hour % 24]
  if (p <= 0.35) return 'valley'
  if (p >= 1.25) return 'sharp'
  if (p >= 1.0) return 'peak'
  return 'flat'
}

/**
 * 计划调度: 根据时段返回目标工况与投入机组数
 * 谷段抽水, 尖峰/峰段发电, 平段待机.
 */
export function plannedDispatch(hour: number): { mode: DispatchMode; units: number } {
  const tier = priceTier(hour)
  switch (tier) {
    case 'valley':
      return { mode: 'pump', units: 4 } // 低谷满负荷抽水
    case 'sharp':
      return { mode: 'generate', units: 4 } // 尖峰满发
    case 'peak':
      return { mode: 'generate', units: 3 }
    default:
      return { mode: 'idle', units: 0 }
  }
}

export function tierLabel(t: ReturnType<typeof priceTier>): string {
  return t === 'valley' ? '低谷' : t === 'flat' ? '平段' : t === 'peak' ? '高峰' : '尖峰'
}

export function tierColor(t: ReturnType<typeof priceTier>): string {
  return t === 'valley' ? '#00d4ff'
    : t === 'flat' ? '#8fa6c4'
    : t === 'peak' ? '#ff9d00'
    : '#ff3860'
}
