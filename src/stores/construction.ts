import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  CUT_ZONES, FILL_ZONES, SPOIL_YARD, BORROW_AREA,
  totalCutPlan, totalFillPlan, usableCutPlan
} from '@/data/construction'

export type Phase = 'construction' | 'operation'

export const useConstructionStore = defineStore('construction', () => {
  // 当前阶段: 在建(2026) → 默认建设期
  const phase = ref<Phase>('construction')

  // 实时施工指标(轻量动画)
  const tripsToday = ref(486) // 今日运输车次
  const movedTodayM3 = ref(3.2) // 今日完成方量(万m³)
  const excavators = ref(38) // 在场挖机
  const trucks = ref(62) // 在场渣土车
  const rollersAuto = ref(6) // 无人碾压机
  const compactionPass = ref(0) // 实时碾压遍数显示
  const slopeDisp = ref(2.3) // 边坡位移监测(mm)

  let acc = 0

  // ---------------- 土石方平衡 ----------------
  const cutPlan = computed(() => totalCutPlan())
  const fillPlan = computed(() => totalFillPlan())
  const usablePlan = computed(() => usableCutPlan())
  // 已完成开挖/填筑(按各区进度加权)
  const cutDone = computed(() =>
    CUT_ZONES.reduce((s, z) => s + z.planM3 * z.progress, 0)
  )
  const fillDone = computed(() =>
    FILL_ZONES.reduce((s, z) => s + z.planM3 * z.progress, 0)
  )
  // 余方(开挖-填筑需求, 正=有富余进弃渣场)
  const surplus = computed(() => cutPlan.value - fillPlan.value)
  // 综合利用率: 可利用方量 / 总开挖
  const utilizationRate = computed(() => (usablePlan.value / cutPlan.value) * 100)
  // 挖填平衡率: 可利用方量 / 填筑需求 (>100% 富余, <100% 需外借)
  const balanceRate = computed(() => (usablePlan.value / fillPlan.value) * 100)
  const spoilUsedPct = computed(() => (SPOIL_YARD.usedM3 / SPOIL_YARD.capacityM3) * 100)
  const borrowUsedPct = computed(() => (BORROW_AREA.usedM3 / BORROW_AREA.reserveM3) * 100)

  // 总体形象进度(挖填加权)
  const overallProgress = computed(() => {
    const total = cutPlan.value + fillPlan.value
    return ((cutDone.value + fillDone.value) / total) * 100
  })

  function setPhase(p: Phase) {
    phase.value = p
  }

  // 轻量动画: 车次/方量/碾压遍数波动
  function tick(dtSec: number) {
    acc += dtSec
    compactionPass.value = 6 + Math.round(2 * Math.abs(Math.sin(acc * 0.6)))
    if (acc > 1.5) {
      acc = 0
      tripsToday.value += Math.floor(Math.random() * 5)
      movedTodayM3.value = +(movedTodayM3.value + Math.random() * 0.05).toFixed(2)
      slopeDisp.value = +(2.0 + Math.random() * 0.8).toFixed(1)
      trucks.value = 58 + Math.floor(Math.random() * 8)
      excavators.value = 35 + Math.floor(Math.random() * 6)
    }
  }

  return {
    phase,
    tripsToday, movedTodayM3, excavators, trucks, rollersAuto,
    compactionPass, slopeDisp,
    cutPlan, fillPlan, usablePlan, cutDone, fillDone,
    surplus, utilizationRate, balanceRate,
    spoilUsedPct, borrowUsedPct, overallProgress,
    setPhase, tick
  }
})
