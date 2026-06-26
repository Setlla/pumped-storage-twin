export type UnitMode = 'stopped' | 'pumping' | 'generating' | 'fault'

export interface UnitState {
  id: number
  name: string
  mode: UnitMode
  /** 当前出力(发电模式) 或 消耗功率(抽水模式), MW. 抽水时为负值. */
  powerMW: number
  /** 目标出力 MW (操作员设定值) */
  targetMW: number
  /** 当前流量 m³/s. 抽水时为负值(下→上) */
  flow: number
  /** 转速 rpm */
  speedRpm: number
  /** 上导轴承温度 °C */
  bearingTemp: number
  /** 振动 mm/s */
  vibration: number
  /** 故障标志 */
  hasAlarm: boolean
}

export interface ReservoirState {
  /** 当前水位 m */
  levelM: number
  /** 当前蓄水量 m³ */
  volumeM3: number
  /** 死水位 m */
  deadLevelM: number
  /** 正常蓄水位 m */
  normalLevelM: number
  /** 总库容 m³ */
  totalCapacityM3: number
}

export type GlobalMode = 'idle' | 'pumping' | 'generating'

export interface AlarmRecord {
  id: string
  ts: number
  level: 'info' | 'warn' | 'critical'
  unitId?: number
  message: string
}
