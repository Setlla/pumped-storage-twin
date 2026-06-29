import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 操作审计日志(数据治理底座) — 关键操作留痕,可追溯 */
const LS = 'psts_audit_v1'

export interface AuditEntry { id: string; ts: number; action: string; detail: string }

function load(): AuditEntry[] {
  try { const r = localStorage.getItem(LS); if (r) return JSON.parse(r) } catch {}
  return []
}

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>(load())

  function persist() { try { localStorage.setItem(LS, JSON.stringify(entries.value)) } catch {} }
  function log(action: string, detail = '') {
    entries.value.unshift({ id: 'A' + Date.now() + Math.random().toString(36).slice(2, 5), ts: Date.now(), action, detail })
    if (entries.value.length > 200) entries.value.length = 200
    persist()
  }
  function clear() { entries.value = []; persist() }

  return { entries, log, clear }
})
