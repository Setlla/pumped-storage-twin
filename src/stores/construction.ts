import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  CUT_ZONES, FILL_ZONES, SPOIL_YARD, STOCKPILE, BORROW_AREA,
  TOTAL_MONTHS, totalCutPlan, totalFillPlan, usableCutPlan,
  zoneProgressAt, monthLabel, buildMonthlySeries
} from '@/data/construction'

export type Phase = 'construction' | 'operation'

const SERIES = buildMonthlySeries()
// 默认时间定位到当前形象进度(约第 60 月, 对应 2026 在建)
const DEFAULT_T = 60 / TOTAL_MONTHS

export const useConstructionStore = defineStore('construction', () => {
  const phase = ref<Phase>('construction')

  // ---- 4D 时间轴 ----
  const timeT = ref(DEFAULT_T) // 0~1
  const playing = ref(false)
  const playSpeed = ref(1)

  const currentMonth = computed(() => timeT.value * TOTAL_MONTHS)
  const monthText = computed(() => monthLabel(currentMonth.value))

  // ---- 实时施工指标 ----
  const slopeDisp = ref(2.3)
  const compactionPass = ref(6)
  const rollersAuto = ref(6)
  let acc = 0

  // 当前月各工区进度(随时间)
  const cutProgress = computed(() =>
    CUT_ZONES.map((z) => ({ ...z, progress: zoneProgressAt(z, currentMonth.value) }))
  )
  const fillProgress = computed(() =>
    FILL_ZONES.map((z) => ({ ...z, progress: zoneProgressAt(z, currentMonth.value) }))
  )

  // 当前月时空平衡序列点
  const seriesPoint = computed(() => {
    const i = Math.max(0, Math.min(SERIES.length - 1, Math.round(currentMonth.value) - 1))
    return SERIES[i]
  })

  // ---- 土石方平衡(累计到当前时刻) ----
  const cutPlan = computed(() => totalCutPlan())
  const fillPlan = computed(() => totalFillPlan())
  const usablePlan = computed(() => usableCutPlan())
  const cutDone = computed(() => cutProgress.value.reduce((s, z) => s + z.planM3 * z.progress, 0))
  const fillDone = computed(() => fillProgress.value.reduce((s, z) => s + z.planM3 * z.progress, 0))
  const surplus = computed(() => cutPlan.value - fillPlan.value)
  const utilizationRate = computed(() => (usablePlan.value / cutPlan.value) * 100)
  const balanceRate = computed(() => (usablePlan.value / fillPlan.value) * 100)

  // 当前中转堆存量(时空错配的直接体现)
  const stockNow = computed(() => seriesPoint.value.stock)
  const stockPct = computed(() => Math.min(100, (stockNow.value / STOCKPILE.capacityM3) * 100))
  // 已弃渣(不可利用料随开挖进度累计)
  const spoilUsed = computed(() =>
    cutProgress.value.reduce((s, z) => s + z.planM3 * (1 - z.usableRate) * z.progress, 0)
  )
  const spoilPct = computed(() => Math.min(100, (spoilUsed.value / SPOIL_YARD.capacityM3) * 100))
  // 外购/加工料(垫层料, 随 liner 进度)
  const borrowUsed = computed(() => {
    const liner = fillProgress.value.find((z) => z.id === 'liner')
    return liner ? liner.planM3 * liner.progress : 0
  })
  const borrowPct = computed(() => Math.min(100, (borrowUsed.value / BORROW_AREA.reserveM3) * 100))

  const overallProgress = computed(() => {
    const total = cutPlan.value + fillPlan.value
    return ((cutDone.value + fillDone.value) / total) * 100
  })

  // 当月强度(车次/方量由当月挖填强度推算)
  const monthlyVolume = computed(() => seriesPoint.value.cut + seriesPoint.value.fill)
  const tripsToday = computed(() => Math.round(monthlyVolume.value * 1e4 / 30 / 25))
  const movedTodayM3 = computed(() => +(monthlyVolume.value / 30).toFixed(2))
  const trucks = computed(() => Math.round(40 + monthlyVolume.value * 2.2))
  const excavators = computed(() => Math.round(20 + monthlyVolume.value * 1.4))

  const series = SERIES
  const dam = computed(() => fillProgress.value.find((z) => z.id === 'upperDam')!)

  function setPhase(p: Phase) { phase.value = p }
  function setTime(t: number) { timeT.value = Math.max(0, Math.min(1, t)) }
  function togglePlay() { playing.value = !playing.value }

  function tick(dtSec: number) {
    acc += dtSec
    compactionPass.value = 6 + Math.round(2 * Math.abs(Math.sin(acc * 0.6)))
    if (acc > 1.2) {
      acc = 0
      slopeDisp.value = +(2.0 + Math.random() * 0.8).toFixed(1)
    }
    if (playing.value) {
      timeT.value += dtSec * 0.03 * playSpeed.value
      if (timeT.value >= 1) { timeT.value = 1; playing.value = false }
    }
  }

  return {
    phase, timeT, playing, playSpeed,
    currentMonth, monthText,
    cutProgress, fillProgress, seriesPoint, series,
    cutPlan, fillPlan, usablePlan, cutDone, fillDone, surplus,
    utilizationRate, balanceRate,
    stockNow, stockPct, spoilUsed, spoilPct, borrowUsed, borrowPct,
    overallProgress, monthlyVolume, tripsToday, movedTodayM3, trucks, excavators,
    slopeDisp, compactionPass, rollersAuto, dam,
    setPhase, setTime, togglePlay, tick
  }
})
