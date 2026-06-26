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
  plannedCommission: '2030',
  location: '江苏省连云港市连云区宿城街道 (云台山)'
} as const

/** 关键设施地理坐标 (云台山宿城一带, 经纬度近似) */
export const SITE_COORDS = {
  // 云台山主峰附近, 上水库设于山顶
  upperReservoir: { lon: 119.358, lat: 34.738, height: 540 },
  // 下水库设于山下近平原侧
  lowerReservoir: { lon: 119.342, lat: 34.692, height: 80 },
  // 地下厂房 (露头表示)
  powerhouse: { lon: 119.347, lat: 34.715, height: 60 },
  // 升压站
  switchyard: { lon: 119.336, lat: 34.708, height: 70 },
  // 镜头默认位置 (俯视全场)
  cameraHome: { lon: 119.35, lat: 34.69, height: 6500 }
} as const

/** 上水库参数 */
export const UPPER_RES = {
  normalLevelM: 540,
  deadLevelM: 510,
  totalCapacityM3: 11_500_000,
  activeCapacityM3: 9_800_000,
  surfaceAreaM2: 600_000
}

/** 下水库参数 */
export const LOWER_RES = {
  normalLevelM: 95,
  deadLevelM: 70,
  totalCapacityM3: 13_200_000,
  activeCapacityM3: 10_500_000,
  surfaceAreaM2: 720_000
}
