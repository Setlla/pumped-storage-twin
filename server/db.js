// 轻量文件存储（JSON）— 无原生依赖，便于私有化部署。生产可平滑替换为 PostgreSQL/PostGIS。
const fs = require('fs')
const path = require('path')

const DATA_FILE = path.join(__dirname, 'data.json')

const SEED = {
  cutZones: [
    { id: 'road', name: '场内道路及平台', planM3: 58, usableRate: 0.5, rock: 0.4, startMonth: 0, durMonth: 18 },
    { id: 'upper', name: '上水库库盆开挖', planM3: 286, usableRate: 0.82, rock: 0.78, startMonth: 6, durMonth: 42 },
    { id: 'lower', name: '下水库库盆开挖', planM3: 152, usableRate: 0.7, rock: 0.6, startMonth: 10, durMonth: 36 },
    { id: 'cavern', name: '地下厂房洞室群', planM3: 96, usableRate: 0.9, rock: 0.97, startMonth: 12, durMonth: 40 },
    { id: 'tunnel', name: '引水/尾水隧洞', planM3: 124, usableRate: 0.88, rock: 0.95, startMonth: 18, durMonth: 42 }
  ],
  fillZones: [
    { id: 'subgrade', name: '道路路基/场平', planM3: 72, startMonth: 4, durMonth: 20 },
    { id: 'lowerDam', name: '下水库坝/围堰', planM3: 108, startMonth: 16, durMonth: 30 },
    { id: 'upperDam', name: '上水库面板堆石坝', planM3: 318, startMonth: 24, durMonth: 42 },
    { id: 'liner', name: '库盆垫层/过渡料', planM3: 42, startMonth: 44, durMonth: 24 }
  ],
  yards: [
    { id: 'Y1', name: '1#弃渣场', type: '弃渣场', capacity: 240, used: 151, material: '不可利用料', status: '启用' },
    { id: 'Y2', name: '中转料场', type: '中转场', capacity: 180, used: 54, material: '石方/堆石料', status: '启用' }
  ],
  roads: [
    { id: 'R1', name: '上库进场主路', from: '上水库', to: '拌和系统', lengthKm: 2.6, gradePct: 8, capacity: 120, status: '畅通' }
  ],
  vehicles: [
    { id: 'V1', plate: '苏G·T2301', type: '自卸渣土车', capacityM3: 25, driver: '王建国', status: '在线' }
  ],
  equips: [
    { id: 'E1', name: '挖机-01', type: '液压挖掘机', spec: '2.5m³', location: '上库库盆', status: '运行' }
  ]
}

const COLLECTIONS = ['cutZones', 'fillZones', 'yards', 'roads', 'vehicles', 'equips']

function read() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) } catch { return null }
}
function write(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)) }
function init() { if (!read()) write(JSON.parse(JSON.stringify(SEED))) }

function getCollection(name) { const d = read() || {}; return d[name] || [] }
function setCollection(name, arr) { const d = read() || {}; d[name] = arr; write(d); return arr }
function upsert(name, row) {
  const arr = getCollection(name)
  const i = arr.findIndex((x) => x.id === row.id)
  if (i >= 0) arr[i] = row; else arr.push(row)
  return setCollection(name, arr)
}
function removeItem(name, id) { return setCollection(name, getCollection(name).filter((x) => x.id !== id)) }
function resetAll() { write(JSON.parse(JSON.stringify(SEED))); return SEED }

module.exports = { COLLECTIONS, init, getCollection, setCollection, upsert, removeItem, resetAll }
