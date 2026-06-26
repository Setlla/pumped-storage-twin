import { defineStore } from 'pinia'
import { ref } from 'vue'

const LS = 'psts_alloc_cfg_v1'
const DEF = { truckCapacityM3: 25, costPerKmPerTrip: 8, stockpileLeadMonth: 6 }

function load() {
  try { const r = localStorage.getItem(LS); if (r) return { ...DEF, ...JSON.parse(r) } } catch {}
  return { ...DEF }
}

export const useAllocationConfig = defineStore('allocCfg', () => {
  const d = load()
  const truckCapacityM3 = ref<number>(d.truckCapacityM3)
  const costPerKmPerTrip = ref<number>(d.costPerKmPerTrip)
  const stockpileLeadMonth = ref<number>(d.stockpileLeadMonth)

  function persist() {
    try { localStorage.setItem(LS, JSON.stringify({ truckCapacityM3: truckCapacityM3.value, costPerKmPerTrip: costPerKmPerTrip.value, stockpileLeadMonth: stockpileLeadMonth.value })) } catch {}
  }
  function reset() { truckCapacityM3.value = DEF.truckCapacityM3; costPerKmPerTrip.value = DEF.costPerKmPerTrip; stockpileLeadMonth.value = DEF.stockpileLeadMonth; persist() }

  return { truckCapacityM3, costPerKmPerTrip, stockpileLeadMonth, persist, reset }
})
