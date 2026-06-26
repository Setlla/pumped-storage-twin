import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  CUT_ZONES, FILL_ZONES, SPOIL_YARD, STOCKPILE, BORROW_AREA,
  TOTAL_MONTHS, zoneProgressAt, monthLabel, buildMonthlySeries,
  type CutZone, type FillZone
} from '@/data/construction'

export type Phase = 'construction' | 'operation'

const DEFAULT_T = 60 / TOTAL_MONTHS
const LS_KEY = 'psts_construction_zones_v1'

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)) }

function loadSaved(): { cut: CutZone[]; fill: FillZone[] } | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (Array.isArray(o.cut) && Array.isArray(o.fill)) return o
  } catch (e) { /* ignore */ }
  return null
}

export const useConstructionStore = defineStore('construction', () => {
  const phase = ref<Phase>('construction')

  // 工区数据(可被导入覆盖; 启动时尝试读本地)
  const saved = loadSaved()
  const cutZones = ref<CutZone[]>(saved ? saved.cut : clone(CUT_ZONES))
  const fillZones = ref<FillZone[]>(saved ? saved.fill : clone(FILL_ZONES))
  const dataSource = ref<'内置示例' | '导入数据'>(saved ? '导入数据' : '内置示例')

  // 4D 时间轴
  const timeT = ref(DEFAULT_T)
  const playing = ref(false)
  const playSpeed = ref(1)
  const currentMonth = computed(() => timeT.value * TOTAL_MONTHS)
  const monthText = computed(() => monthLabel(currentMonth.value))

  // 实时施工指标
  const slopeDisp = ref(2.3)
  const compactionPass = ref(6)
  const rollersAuto = ref(6)
  let acc = 0

  const cutProgress = computed(() =>
    cutZones.value.map((z) => ({ ...z, progress: zoneProgressAt(z, currentMonth.value) }))
  )
  const fillProgress = computed(() =>
    fillZones.value.map((z) => ({ ...z, progress: zoneProgressAt(z, currentMonth.value) }))
  )
  const series = computed(() => buildMonthlySeries(cutZones.value, fillZones.value))
  const seriesPoint = computed(() => {
    const s = series.value
    const i = Math.max(0, Math.min(s.length - 1, Math.round(currentMonth.value) - 1))
    return s[i]
  })

  // 土石方平衡
  const cutPlan = computed(() => cutZones.value.reduce((a, z) => a + z.planM3, 0))
  const fillPlan = computed(() => fillZones.value.reduce((a, z) => a + z.planM3, 0))
  const usablePlan = computed(() => cutZones.value.reduce((a, z) => a + z.planM3 * z.usableRate, 0))
  const cutDone = computed(() => cutProgress.value.reduce((s, z) => s + z.planM3 * z.progress, 0))
  const fillDone = computed(() => fillProgress.value.reduce((s, z) => s + z.planM3 * z.progress, 0))
  const surplus = computed(() => cutPlan.value - fillPlan.value)
  const utilizationRate = computed(() => (cutPlan.value > 0 ? (usablePlan.value / cutPlan.value) * 100 : 0))
  const balanceRate = computed(() => (fillPlan.value > 0 ? (usablePlan.value / fillPlan.value) * 100 : 0))

  const stockNow = computed(() => seriesPoint.value.stock)
  const stockPct = computed(() => Math.min(100, (stockNow.value / STOCKPILE.capacityM3) * 100))
  const spoilUsed = computed(() =>
    cutProgress.value.reduce((s, z) => s + z.planM3 * (1 - z.usableRate) * z.progress, 0)
  )
  const spoilPct = computed(() => Math.min(100, (spoilUsed.value / SPOIL_YARD.capacityM3) * 100))
  const borrowUsed = computed(() => {
    const liner = fillProgress.value.find((z) => z.id === 'liner')
    return liner ? liner.planM3 * liner.progress : 0
  })
  const borrowPct = computed(() => Math.min(100, (borrowUsed.value / BORROW_AREA.reserveM3) * 100))

  const overallProgress = computed(() => {
    const total = cutPlan.value + fillPlan.value
    return total > 0 ? ((cutDone.value + fillDone.value) / total) * 100 : 0
  })

  const monthlyVolume = computed(() => seriesPoint.value.cut + seriesPoint.value.fill)
  const tripsToday = computed(() => Math.round((monthlyVolume.value * 1e4) / 30 / 25))
  const movedTodayM3 = computed(() => +(monthlyVolume.value / 30).toFixed(2))
  const trucks = computed(() => Math.round(40 + monthlyVolume.value * 2.2))
  const excavators = computed(() => Math.round(20 + monthlyVolume.value * 1.4))
  const dam = computed(() => fillProgress.value.find((z) => z.id === 'upperDam') || fillProgress.value[0])

  function setPhase(p: Phase) { phase.value = p }
  function setTime(t: number) { timeT.value = Math.max(0, Math.min(1, t)) }
  function togglePlay() { playing.value = !playing.value }

  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cut: cutZones.value, fill: fillZones.value })) } catch (e) { /* ignore */ }
  }
  function applyImport(cut: CutZone[], fill: FillZone[]) {
    if (cut.length) cutZones.value = cut
    if (fill.length) fillZones.value = fill
    dataSource.value = '导入数据'
    persist()
  }
  function resetData() {
    cutZones.value = clone(CUT_ZONES)
    fillZones.value = clone(FILL_ZONES)
    dataSource.value = '内置示例'
    try { localStorage.removeItem(LS_KEY) } catch (e) { /* ignore */ }
  }

  function tick(dtSec: number) {
    acc += dtSec
    compactionPass.value = 6 + Math.round(2 * Math.abs(Math.sin(acc * 0.6)))
    if (acc > 1.2) { acc = 0; slopeDisp.value = +(2.0 + Math.random() * 0.8).toFixed(1) }
    if (playing.value) {
      timeT.value += dtSec * 0.03 * playSpeed.value
      if (timeT.value >= 1) { timeT.value = 1; playing.value = false }
    }
  }

  return {
    phase, timeT, playing, playSpeed, currentMonth, monthText,
    cutZones, fillZones, dataSource,
    cutProgress, fillProgress, seriesPoint, series,
    cutPlan, fillPlan, usablePlan, cutDone, fillDone, surplus,
    utilizationRate, balanceRate,
    stockNow, stockPct, spoilUsed, spoilPct, borrowUsed, borrowPct,
    overallProgress, monthlyVolume, tripsToday, movedTodayM3, trucks, excavators,
    slopeDisp, compactionPass, rollersAuto, dam,
    setPhase, setTime, togglePlay, applyImport, resetData, tick
  }
})
