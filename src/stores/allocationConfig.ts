import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Strategy } from '@/logic/allocation'

const LS = 'psts_alloc_cfg_v2'
const LS_SAVED = 'psts_alloc_schemes_v1'
const DEF = { truckCapacityM3: 25, costPerKmPerTrip: 8, stockpileLeadMonth: 6, strategy: 'distance' as Strategy }

function load() {
  try { const r = localStorage.getItem(LS); if (r) return { ...DEF, ...JSON.parse(r) } } catch {}
  return { ...DEF }
}
function loadSchemes() {
  try { const r = localStorage.getItem(LS_SAVED); if (r) return JSON.parse(r) } catch {}
  return []
}

export interface SavedScheme {
  id: string
  name: string
  ts: number
  strategy: Strategy
  kpi: any
}

export const useAllocationConfig = defineStore('allocCfg', () => {
  const d = load()
  const truckCapacityM3 = ref<number>(d.truckCapacityM3)
  const costPerKmPerTrip = ref<number>(d.costPerKmPerTrip)
  const stockpileLeadMonth = ref<number>(d.stockpileLeadMonth)
  const strategy = ref<Strategy>(d.strategy)
  const schemes = ref<SavedScheme[]>(loadSchemes())

  function persist() {
    try { localStorage.setItem(LS, JSON.stringify({ truckCapacityM3: truckCapacityM3.value, costPerKmPerTrip: costPerKmPerTrip.value, stockpileLeadMonth: stockpileLeadMonth.value, strategy: strategy.value })) } catch {}
  }
  function persistSchemes() {
    try { localStorage.setItem(LS_SAVED, JSON.stringify(schemes.value)) } catch {}
  }
  function setStrategy(s: Strategy) { strategy.value = s; persist() }
  function reset() {
    truckCapacityM3.value = DEF.truckCapacityM3; costPerKmPerTrip.value = DEF.costPerKmPerTrip
    stockpileLeadMonth.value = DEF.stockpileLeadMonth; strategy.value = DEF.strategy; persist()
  }
  function saveScheme(name: string, kpi: any) {
    schemes.value.unshift({ id: 'S' + Date.now(), name, ts: Date.now(), strategy: strategy.value, kpi })
    if (schemes.value.length > 20) schemes.value.length = 20
    persistSchemes()
  }
  function removeScheme(id: string) { schemes.value = schemes.value.filter((x) => x.id !== id); persistSchemes() }

  return { truckCapacityM3, costPerKmPerTrip, stockpileLeadMonth, strategy, schemes, persist, setStrategy, reset, saveScheme, removeScheme }
})
