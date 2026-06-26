import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 基础资料台账(一库) — 料场/堆场、道路、车辆、设备 的统一管理 */

export interface Yard { id: string; name: string; type: '料场' | '中转场' | '弃渣场'; capacity: number; used: number; material: string; status: string }
export interface Road { id: string; name: string; from: string; to: string; lengthKm: number; gradePct: number; capacity: number; status: string }
export interface Vehicle { id: string; plate: string; type: string; capacityM3: number; driver: string; status: '在线' | '离线' | '维修' }
export interface Equip { id: string; name: string; type: string; spec: string; location: string; status: '运行' | '待机' | '检修' }

const LS = 'psts_masterdata_v1'

const DEF = {
  yards: [
    { id: 'Y1', name: '1#弃渣场', type: '弃渣场', capacity: 240, used: 151, material: '不可利用料', status: '启用' },
    { id: 'Y2', name: '中转料场', type: '中转场', capacity: 180, used: 54, material: '石方/堆石料', status: '启用' },
    { id: 'Y3', name: '垫层料加工区', type: '料场', capacity: 80, used: 28, material: '垫层/过渡料', status: '启用' }
  ] as Yard[],
  roads: [
    { id: 'R1', name: '上库进场主路', from: '上水库', to: '拌和系统', lengthKm: 2.6, gradePct: 8, capacity: 120, status: '畅通' },
    { id: 'R2', name: '坝区运输路', from: '开挖区', to: '面板堆石坝', lengthKm: 1.4, gradePct: 6, capacity: 150, status: '畅通' },
    { id: 'R3', name: '弃渣运输路', from: '开挖区', to: '1#弃渣场', lengthKm: 3.1, gradePct: 5, capacity: 90, status: '管制' }
  ] as Road[],
  vehicles: [
    { id: 'V1', plate: '苏G·T2301', type: '自卸渣土车', capacityM3: 25, driver: '王建国', status: '在线' },
    { id: 'V2', plate: '苏G·T2307', type: '自卸渣土车', capacityM3: 25, driver: '李强', status: '在线' },
    { id: 'V3', plate: '苏G·T2312', type: '重型自卸车', capacityM3: 35, driver: '张伟', status: '维修' }
  ] as Vehicle[],
  equips: [
    { id: 'E1', name: '挖机-01', type: '液压挖掘机', spec: '2.5m³', location: '上库库盆', status: '运行' },
    { id: 'E2', name: '碾压机-01', type: '无人碾压机', spec: '26t', location: '面板堆石坝', status: '运行' },
    { id: 'E3', name: '装载机-01', type: '轮式装载机', spec: '5t', location: '中转料场', status: '待机' }
  ] as Equip[]
}

function load() {
  try { const r = localStorage.getItem(LS); if (r) return JSON.parse(r) } catch {}
  return JSON.parse(JSON.stringify(DEF))
}

export const useMasterDataStore = defineStore('masterData', () => {
  const data = load()
  const yards = ref<Yard[]>(data.yards)
  const roads = ref<Road[]>(data.roads)
  const vehicles = ref<Vehicle[]>(data.vehicles)
  const equips = ref<Equip[]>(data.equips)

  type Cat = 'yards' | 'roads' | 'vehicles' | 'equips'
  const refs = { yards, roads, vehicles, equips }

  function persist() {
    try {
      localStorage.setItem(LS, JSON.stringify({
        yards: yards.value, roads: roads.value, vehicles: vehicles.value, equips: equips.value
      }))
    } catch {}
  }
  function save(cat: Cat, row: any) {
    const list = refs[cat]
    const i = list.value.findIndex((x: any) => x.id === row.id)
    if (i >= 0) (list.value as any[])[i] = row
    else (list.value as any[]).push(row)
    persist()
  }
  function remove(cat: Cat, id: string) {
    const list = refs[cat]
    ;(list as any).value = (list.value as any[]).filter((x: any) => x.id !== id)
    persist()
  }
  function reset() {
    const d = JSON.parse(JSON.stringify(DEF))
    yards.value = d.yards; roads.value = d.roads; vehicles.value = d.vehicles; equips.value = d.equips
    try { localStorage.removeItem(LS) } catch {}
  }
  function replaceAll(p: { yards?: Yard[]; roads?: Road[]; vehicles?: Vehicle[]; equips?: Equip[] }) {
    if (p.yards) yards.value = p.yards
    if (p.roads) roads.value = p.roads
    if (p.vehicles) vehicles.value = p.vehicles
    if (p.equips) equips.value = p.equips
    persist()
  }

  return { yards, roads, vehicles, equips, save, remove, reset, replaceAll }
})
