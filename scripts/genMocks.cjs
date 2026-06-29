/**
 * 生成配套 mock 数据(Excel),用于演示:
 *  1) 施工进度计划表  2) 车辆运输记录  3) 安全监测数据
 * 运行: node scripts/genMocks.cjs
 * 数据为典型抽蓄工程合理估算,非真实值。
 */
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const outDir = path.join(__dirname, '..', 'samples')
fs.mkdirSync(outDir, { recursive: true })

function save(name, header, rows, cols) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  ws['!cols'] = (cols || header.map(() => 14)).map((w) => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, name)
  const f = path.join(outDir, name + '.xlsx')
  XLSX.writeFile(wb, f)
  console.log('生成:', f, `(${rows.length} 行)`)
}

// ---------- 1) 施工进度计划表 ----------
const PLAN = [
  ['SK-CUT-01', '上水库库盆开挖', '开挖', '2023-12', '2027-06', 286, 74],
  ['GF-CUT-01', '地下厂房系统洞室开挖', '开挖', '2024-06', '2027-06', 68, 55],
  ['YS-CUT-01', '引水隧洞开挖', '开挖', '2024-10', '2028-02', 72, 48],
  ['XK-CUT-01', '下水库库盆开挖', '开挖', '2024-04', '2027-04', 152, 62],
  ['SK-FILL-01', '上水库面板堆石坝填筑', '填筑', '2025-06', '2029-12', 318, 58],
  ['XK-FILL-01', '下水库主坝填筑', '填筑', '2024-10', '2027-04', 96, 66],
  ['RD-FILL-01', '道路路基填筑', '填筑', '2023-10', '2025-08', 58, 100],
  ['GD-FILL-01', '厂区场平回填', '填筑', '2024-02', '2025-08', 24, 88]
]
save('施工进度计划表',
  ['工区编号', '工区名称', '类型', '计划开工', '计划完工', '计划方量(万m³)', '当前形象进度(%)'],
  PLAN, [12, 22, 8, 12, 12, 16, 18])

// ---------- 2) 车辆运输记录 ----------
const PLATES = ['苏G·T2301', '苏G·T2307', '苏G·T2312', '苏G·T2318', '苏G·T2325', '苏G·T2330']
const ROUTES = [
  ['上水库库盆', '面板堆石坝', '石方/堆石料'],
  ['地下厂房', '中转料场', '石方/堆石料'],
  ['下水库库盆', '道路路基', '土石混合料'],
  ['开挖区', '1#弃渣场', '覆盖层']
]
const trips = []
const base = new Date('2026-06-26T07:00:00')
for (let i = 0; i < 60; i++) {
  const r = ROUTES[i % ROUTES.length]
  const plate = PLATES[i % PLATES.length]
  const buckets = 4 + (i % 4)
  const vol = +(buckets * 5 * (0.95 + (i % 5) * 0.02)).toFixed(1)
  const weight = +(vol * 1.9 * (0.97 + (i % 3) * 0.02)).toFixed(1)
  const consistent = Math.abs(weight / 1.9 - vol) / vol < 0.15 ? '一致' : '异常'
  const t = new Date(base.getTime() + i * 9 * 60000)
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  trips.push([`2026-06-26 ${hh}:${mm}`, plate, r[0], r[1], r[2], weight, buckets, vol, consistent])
}
save('车辆运输记录',
  ['时间', '车牌', '起点', '终点', '料质', '称重(t)', '抬斗(次)', '折算方量(m³)', '称重抬斗校验'],
  trips, [18, 12, 14, 14, 14, 10, 10, 14, 14])

// ---------- 3) 安全监测数据 ----------
const POINTS = [
  ['SLOPE-01', '上水库高边坡', '表面位移', 'mm', 5.0],
  ['SLOPE-02', '进场道路边坡', '表面位移', 'mm', 5.0],
  ['ROCK-01', '地下厂房围岩', '收敛', 'mm', 8.0],
  ['DAM-01', '面板堆石坝坝体', '沉降', 'mm', 30.0],
  ['SEEP-01', '坝基渗压计', '渗压', 'kPa', 120.0]
]
const monitor = []
for (let d = 0; d < 7; d++) {
  const day = `2026-06-${String(20 + d).padStart(2, '0')}`
  POINTS.forEach((p, idx) => {
    const val = +((p[4] * 0.45) + (d * 0.12) + idx * 0.3 + Math.random() * 0.6).toFixed(2)
    const ratio = val / p[4]
    const status = ratio > 1 ? '预警' : ratio > 0.8 ? '关注' : '正常'
    monitor.push([day, p[0], p[1], p[2], val, p[3], p[4], status])
  })
}
save('安全监测数据',
  ['日期', '测点编号', '部位', '监测项', '实测值', '单位', '预警阈值', '状态'],
  monitor, [12, 12, 16, 12, 10, 8, 12, 8])

console.log('全部完成,输出目录:', outDir)
