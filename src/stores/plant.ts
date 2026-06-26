import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  PLANT_INFO,
  UPPER_RES,
  LOWER_RES
} from '@/data/plantConfig'
import type {
  UnitState,
  ReservoirState,
  GlobalMode,
  AlarmRecord
} from '@/types/plant'

const RES_INIT_FRACTION = 0.7 // 初始水位处于 70% 活库容
const SIM_FLOW_AMP = 60 // 仿真加速倍数(让水位变化在演示时间尺度可见)

function makeInitialUnit(id: number): UnitState {
  return {
    id,
    name: `#${id} 机组`,
    mode: 'stopped',
    powerMW: 0,
    targetMW: 0,
    flow: 0,
    speedRpm: 0,
    bearingTemp: 32 + Math.random() * 2,
    vibration: 0.4 + Math.random() * 0.2,
    hasAlarm: false
  }
}

function makeInitialReservoir(cfg: typeof UPPER_RES): ReservoirState {
  const range = cfg.normalLevelM - cfg.deadLevelM
  const level = cfg.deadLevelM + range * RES_INIT_FRACTION
  return {
    levelM: level,
    volumeM3: cfg.activeCapacityM3 * RES_INIT_FRACTION,
    deadLevelM: cfg.deadLevelM,
    normalLevelM: cfg.normalLevelM,
    totalCapacityM3: cfg.totalCapacityM3
  }
}


export const usePlantStore = defineStore('plant', () => {
  // ---------------- 状态 ----------------
  const units = ref<UnitState[]>(
    Array.from({ length: PLANT_INFO.unitCount }, (_, i) => makeInitialUnit(i + 1))
  )
  const upperReservoir = ref<ReservoirState>(makeInitialReservoir(UPPER_RES))
  const lowerReservoir = ref<ReservoirState>(makeInitialReservoir(LOWER_RES))
  const globalMode = ref<GlobalMode>('idle')
  const simRunning = ref(true)
  const simSpeed = ref(1) // 1x ~ 10x
  const alarms = ref<AlarmRecord[]>([])
  const powerHistory = ref<{ ts: number; mw: number }[]>([])
  // 能量统计 (MWh)
  const energyGenerated = ref(0)
  const energyPumped = ref(0)
  // 当前选中机组 (用于 3D 场景联动)
  const selectedUnitId = ref<number | null>(null)

  // ---------------- 计算 ----------------
  const totalPowerMW = computed(() =>
    units.value.reduce((sum, u) => sum + u.powerMW, 0)
  )
  const runningUnitCount = computed(
    () => units.value.filter((u) => u.mode === 'pumping' || u.mode === 'generating').length
  )
  const netHeadM = computed(
    () => upperReservoir.value.levelM - lowerReservoir.value.levelM
  )
  const upperFillPct = computed(() => {
    const r = upperReservoir.value
    return ((r.levelM - r.deadLevelM) / (r.normalLevelM - r.deadLevelM)) * 100
  })
  const lowerFillPct = computed(() => {
    const r = lowerReservoir.value
    return ((r.levelM - r.deadLevelM) / (r.normalLevelM - r.deadLevelM)) * 100
  })
  // 综合效率(往返效率): 发电量/抽水耗电量
  const roundTripEfficiency = computed(() => {
    if (energyPumped.value < 0.01) return 0
    return (energyGenerated.value / energyPumped.value) * 100
  })


  // ---------------- 操作 ----------------
  function setGlobalMode(mode: GlobalMode) {
    globalMode.value = mode
    units.value.forEach((u) => {
      if (u.hasAlarm) return
      if (mode === 'idle') {
        u.mode = 'stopped'
        u.targetMW = 0
      } else if (mode === 'pumping') {
        u.mode = 'pumping'
        u.targetMW = -PLANT_INFO.unitCapacityMW
      } else {
        u.mode = 'generating'
        u.targetMW = PLANT_INFO.unitCapacityMW
      }
    })
    pushAlarm('info', `工况切换 → ${modeLabel(mode)}`)
  }

  function toggleUnit(id: number) {
    const u = units.value.find((x) => x.id === id)
    if (!u) return
    if (u.hasAlarm) return
    if (u.mode === 'stopped') {
      if (globalMode.value === 'pumping') {
        u.mode = 'pumping'
        u.targetMW = -PLANT_INFO.unitCapacityMW
      } else if (globalMode.value === 'generating') {
        u.mode = 'generating'
        u.targetMW = PLANT_INFO.unitCapacityMW
      } else {
        pushAlarm('warn', `${u.name} 启动失败:全局工况为停机`)
        return
      }
    } else {
      u.mode = 'stopped'
      u.targetMW = 0
    }
  }

  function injectFault(id: number) {
    const u = units.value.find((x) => x.id === id)
    if (!u) return
    u.hasAlarm = true
    u.mode = 'fault'
    u.targetMW = 0
    pushAlarm('critical', `${u.name} 振动越限,触发保护停机`)
  }

  function clearFault(id: number) {
    const u = units.value.find((x) => x.id === id)
    if (!u) return
    u.hasAlarm = false
    u.mode = 'stopped'
    pushAlarm('info', `${u.name} 故障已复位`)
  }

  function selectUnit(id: number | null) {
    selectedUnitId.value = id
  }


  function pushAlarm(level: AlarmRecord['level'], message: string, unitId?: number) {
    alarms.value.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      level,
      unitId,
      message
    })
    if (alarms.value.length > 50) alarms.value.length = 50
  }

  // ---------------- 仿真步进 ----------------
  function tick(dtSec: number) {
    if (!simRunning.value) return
    const dt = dtSec * simSpeed.value

    // 更新机组动态
    let netFlow = 0 // m³/s, 正=上库进水(发电时下→上为负, 抽水时下→上为正实际上是反向)
    units.value.forEach((u) => {
      const drift = (u.targetMW - u.powerMW) * Math.min(1, dt * 0.5)
      u.powerMW += drift

      if (u.mode === 'generating') {
        u.flow = (u.powerMW / PLANT_INFO.unitCapacityMW) * PLANT_INFO.ratedFlowPerUnit
        u.speedRpm = PLANT_INFO.ratedSpeedRpm + (Math.random() - 0.5) * 1.4
        u.bearingTemp = 55 + (u.powerMW / PLANT_INFO.unitCapacityMW) * 12 + (Math.random() - 0.5)
        u.vibration = 1.4 + Math.random() * 0.6
        netFlow -= u.flow // 发电:上库出水
      } else if (u.mode === 'pumping') {
        u.flow = (u.powerMW / PLANT_INFO.unitCapacityMW) * PLANT_INFO.ratedFlowPerUnit
        u.speedRpm = -PLANT_INFO.ratedSpeedRpm + (Math.random() - 0.5) * 1.4
        u.bearingTemp = 52 + Math.abs(u.powerMW / PLANT_INFO.unitCapacityMW) * 12 + (Math.random() - 0.5)
        u.vibration = 1.6 + Math.random() * 0.6
        netFlow -= u.flow // 抽水:powerMW 为负,flow 为负 → -flow = 正,上库进水
      } else if (u.mode === 'fault') {
        u.flow = 0
        u.speedRpm = 0
        u.bearingTemp += (78 - u.bearingTemp) * dt * 0.05
        u.vibration = 8 + Math.random() * 1.5
      } else {
        u.flow = 0
        u.speedRpm *= 0.9
        u.bearingTemp += (32 - u.bearingTemp) * dt * 0.05
        u.vibration = 0.4 + Math.random() * 0.15
      }
    })


    // 更新水库
    const dV = netFlow * dt * SIM_FLOW_AMP
    upperReservoir.value.volumeM3 = clamp(
      upperReservoir.value.volumeM3 + dV,
      0,
      UPPER_RES.activeCapacityM3
    )
    lowerReservoir.value.volumeM3 = clamp(
      lowerReservoir.value.volumeM3 - dV,
      0,
      LOWER_RES.activeCapacityM3
    )

    upperReservoir.value.levelM = volToLevel(
      upperReservoir.value.volumeM3,
      UPPER_RES
    )
    lowerReservoir.value.levelM = volToLevel(
      lowerReservoir.value.volumeM3,
      LOWER_RES
    )

    // 历史功率
    powerHistory.value.push({ ts: Date.now(), mw: totalPowerMW.value })
    if (powerHistory.value.length > 240) powerHistory.value.shift()

    // 能量累计 (MWh): 功率(MW) * 时间(h). dt 为加速后的秒数
    const hours = dt / 3600
    units.value.forEach((u) => {
      if (u.mode === 'generating') energyGenerated.value += u.powerMW * hours
      else if (u.mode === 'pumping') energyPumped.value += Math.abs(u.powerMW) * hours
    })

    // 简单越限告警
    units.value.forEach((u) => {
      if (u.bearingTemp > 75 && !u.hasAlarm) {
        u.hasAlarm = true
        pushAlarm('warn', `${u.name} 上导轴承温度越限 ${u.bearingTemp.toFixed(1)}°C`, u.id)
      }
    })
  }

  // ---------------- 工具 ----------------
  function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x))
  }
  function volToLevel(vol: number, cfg: typeof UPPER_RES) {
    const range = cfg.normalLevelM - cfg.deadLevelM
    return cfg.deadLevelM + (vol / cfg.activeCapacityM3) * range
  }
  function modeLabel(m: GlobalMode) {
    return m === 'idle' ? '停机备用' : m === 'pumping' ? '抽水' : '发电'
  }

  return {
    units,
    upperReservoir,
    lowerReservoir,
    globalMode,
    simRunning,
    simSpeed,
    alarms,
    powerHistory,
    energyGenerated,
    energyPumped,
    selectedUnitId,
    totalPowerMW,
    runningUnitCount,
    netHeadM,
    upperFillPct,
    lowerFillPct,
    roundTripEfficiency,
    setGlobalMode,
    toggleUnit,
    injectFault,
    clearFault,
    selectUnit,
    tick
  }
})
