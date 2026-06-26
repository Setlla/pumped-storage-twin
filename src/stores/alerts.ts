import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_THRESHOLDS, type Thresholds } from '@/logic/alerts'

const TH_KEY = 'psts_alert_thresholds_v1'
const HD_KEY = 'psts_alert_handled_v1'

export interface Handled { status: 'closed'; note: string; ts: number }

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
}

export const useAlertStore = defineStore('alerts', () => {
  const thresholds = ref<Thresholds>(load(TH_KEY, { ...DEFAULT_THRESHOLDS }))
  const handled = ref<Record<string, Handled>>(load(HD_KEY, {}))

  function saveTh() { try { localStorage.setItem(TH_KEY, JSON.stringify(thresholds.value)) } catch {} }
  function saveHd() { try { localStorage.setItem(HD_KEY, JSON.stringify(handled.value)) } catch {} }

  function setThreshold<K extends keyof Thresholds>(k: K, v: number) {
    thresholds.value[k] = v as Thresholds[K]; saveTh()
  }
  function resetThresholds() { thresholds.value = { ...DEFAULT_THRESHOLDS }; saveTh() }

  function close(id: string, note: string) {
    handled.value[id] = { status: 'closed', note, ts: Date.now() }; saveHd()
  }
  function reopen(id: string) { delete handled.value[id]; saveHd() }

  return { thresholds, handled, setThreshold, resetThresholds, close, reopen }
})
