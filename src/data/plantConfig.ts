/**
 * 江苏连云港抽水蓄能电站 基础参数
 *
 * 数据来源:
 * - 公开资料: Global Energy Monitor (gem.wiki)
 * - 装机 1200MW (4×300MW), 计划 2030 投运
 * - 业主: 江苏国信连云港发电有限公司
 *
 * 注意: 上下水库精确坐标/库容/水位等真实工程数据公开不可得,
 * 以下数值为基于云台山地形 + 行业典型 4×300MW 机型的合理估算,
 * 用于演示型数字孪生.
 */

export const PLANT_INFO = {
  name: '江苏连云港抽水蓄能电站',
  shortName: '连云港抽蓄',
  enName: 'Lianyungang Pumped Storage',
  owner: '江苏国信连云港发电有限公司',
  totalCapacityMW: 1200,
  unitCount: 4,
  unitCapacityMW: 300,
  designHeadM: 380, // 额定水头 (估算)
  ratedFlowPerUnit: 88, // m³/s 单机额定流量
  ratedSpeedRpm: 333,
  pumpEfficiency: 0.90, // 抽水(电→势能)效率
  turbineEfficiency: 0.85, // 发电(势能→电)效率
  // 往返综合效率 ≈ 0.90 × 0.85 ≈ 0.765 (抽蓄典型 75%~80%)
  roundTripEfficiency: 0.765,
  plannedCommission: '2030',
  location: '江苏省连云港市连云区宿城街道 (云台山)'
} as const

/** 关键设施地理坐标 (云台山宿城一带, 紧凑南北向布置, 强化上下库高差立体感) */
export const SITE_COORDS = {
  // 上水库设于云台山顶
  upperReservoir: { lon: 119.3500, lat: 34.7250, height: 500 },
  // 下水库设于山下(约 1.6km 之南), 形成高差
  lowerReservoir: { lon: 119.3500, lat: 34.7100, height: 70 },
  // 地下厂房 (位于山体内部偏下游)
  powerhouse: { lon: 119.3500, lat: 34.7185, height: 110 },
  // 升压站 (地面, 下游侧)
  switchyard: { lon: 119.3475, lat: 34.7120, height: 90 },
  // 镜头默认位置 (东南方俯瞰全场)
  cameraHome: { lon: 119.3640, lat: 34.7010, height: 2200 }
} as const

/** 上水库参数 */
export const UPPER_RES = {
  normalLevelM: 500,
  deadLevelM: 470,
  totalCapacityM3: 11_500_000,
  activeCapacityM3: 9_800_000,
  surfaceAreaM2: 600_000
}

/** 下水库参数 */
export const LOWER_RES = {
  normalLevelM: 72,
  deadLevelM: 52,
  totalCapacityM3: 13_200_000,
  activeCapacityM3: 10_500_000,
  surfaceAreaM2: 720_000
}
