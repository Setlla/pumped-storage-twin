/**
 * 土石方台账导入 / 模板导出（Excel / CSV）
 *
 * 让数字孪生跑在项目真实台账数据上：用户下载模板→填真实方量/计划→导入，
 * 整套平衡/进度/时空/调配随即基于真实数据计算。
 */
import * as XLSX from 'xlsx'
import { CUT_ZONES, FILL_ZONES, type CutZone, type FillZone } from '@/data/construction'

const HEADERS = ['类型', '编号', '名称', '计划方量(万m³)', '可利用率', '开工月', '工期月']

export interface ParsedData {
  cut: CutZone[]
  fill: FillZone[]
  errors: string[]
}

/** 下载导入模板（含当前示例数据作为样例行） */
export function downloadTemplate() {
  const rows: (string | number)[][] = [HEADERS]
  CUT_ZONES.forEach((z) =>
    rows.push(['开挖', z.id, z.name, z.planM3, z.usableRate, z.startMonth, z.durMonth])
  )
  FILL_ZONES.forEach((z) =>
    rows.push(['填筑', z.id, z.name, z.planM3, '', z.startMonth, z.durMonth])
  )
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = HEADERS.map(() => ({ wch: 16 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '土石方台账')
  XLSX.writeFile(wb, '土石方台账导入模板.xlsx')
}

/** 解析上传的 Excel/CSV 文件 */
export async function parseFile(file: File): Promise<ParsedData> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

  const cut: CutZone[] = []
  const fill: FillZone[] = []
  const errors: string[] = []

  rows.forEach((r, i) => {
    const type = String(r['类型'] || '').trim()
    const id = String(r['编号'] || `z${i}`).trim()
    const name = String(r['名称'] || '').trim()
    const plan = Number(r['计划方量(万m³)'])
    const start = Number(r['开工月'])
    const dur = Number(r['工期月'])
    if (!name || isNaN(plan)) {
      errors.push(`第 ${i + 2} 行: 名称或方量无效, 已跳过`)
      return
    }
    const startM = isNaN(start) ? 0 : start
    const durM = isNaN(dur) || dur <= 0 ? 12 : dur
    if (type.includes('挖')) {
      let rate = Number(r['可利用率'])
      if (isNaN(rate)) rate = 0.8
      if (rate > 1) rate = rate / 100 // 容许填 82 或 0.82
      cut.push({ id, name, planM3: plan, usableRate: rate, rock: 0.8, startMonth: startM, durMonth: durM })
    } else if (type.includes('填')) {
      fill.push({ id, name, planM3: plan, startMonth: startM, durMonth: durM })
    } else {
      errors.push(`第 ${i + 2} 行: 类型需为"开挖"或"填筑", 已跳过`)
    }
  })

  if (cut.length === 0 && fill.length === 0) {
    errors.push('未解析到有效数据, 请使用模板格式')
  }
  return { cut, fill, errors }
}
