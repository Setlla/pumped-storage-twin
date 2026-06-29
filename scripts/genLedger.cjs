/**
 * 生成"土石方台账示例 Excel"(符合系统导入模板)
 * 运行: node scripts/genLedger.cjs
 * 数据为典型 1200MW 抽蓄工程的细化合理估算(非真实设计值),用于演示导入。
 */
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const HEADERS = ['类型', '编号', '名称', '计划方量(万m³)', '可利用率', '开工月', '工期月']

// 开挖区(含料质可利用率)
const CUT = [
  ['开挖', 'SK-CUT-01', '上水库库盆开挖', 286, 0.82, 6, 42],
  ['开挖', 'SK-CUT-02', '上水库进/出水口开挖', 24, 0.75, 8, 18],
  ['开挖', 'GF-CUT-01', '地下厂房系统洞室开挖', 68, 0.95, 12, 36],
  ['开挖', 'GF-CUT-02', '主变洞/母线洞开挖', 28, 0.95, 14, 30],
  ['开挖', 'YS-CUT-01', '引水隧洞开挖', 72, 0.90, 16, 40],
  ['开挖', 'WS-CUT-01', '尾水隧洞开挖', 52, 0.88, 18, 40],
  ['开挖', 'XK-CUT-01', '下水库库盆开挖', 152, 0.70, 10, 36],
  ['开挖', 'RD-CUT-01', '进场及上坝道路开挖', 46, 0.50, 0, 18],
  ['开挖', 'GD-CUT-01', '开关站及地面建筑开挖', 18, 0.55, 6, 16]
]

// 填筑区
const FILL = [
  ['填筑', 'SK-FILL-01', '上水库面板堆石坝填筑', 318, '', 24, 42],
  ['填筑', 'SK-FILL-02', '上水库库盆垫层/找平', 36, '', 40, 24],
  ['填筑', 'XK-FILL-01', '下水库主坝填筑', 96, '', 16, 30],
  ['填筑', 'XK-FILL-02', '下水库副坝/围堰', 28, '', 14, 20],
  ['填筑', 'RD-FILL-01', '道路路基填筑', 58, '', 4, 22],
  ['填筑', 'GD-FILL-01', '厂区场平回填', 24, '', 8, 18]
]

const rows = [HEADERS, ...CUT, ...FILL]
const ws = XLSX.utils.aoa_to_sheet(rows)
ws['!cols'] = HEADERS.map((h, i) => ({ wch: i === 2 ? 24 : 14 }))
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, '土石方台账')

const outDir = path.join(__dirname, '..', 'samples')
fs.mkdirSync(outDir, { recursive: true })
const out = path.join(outDir, '连云港抽蓄_土石方台账_示例.xlsx')
XLSX.writeFile(wb, out)

const totalCut = CUT.reduce((a, r) => a + r[3], 0)
const totalFill = FILL.reduce((a, r) => a + r[3], 0)
console.log('已生成:', out)
console.log(`开挖 ${CUT.length} 项 合计 ${totalCut} 万m³ / 填筑 ${FILL.length} 项 合计 ${totalFill} 万m³`)
