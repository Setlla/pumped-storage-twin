/**
 * 决策论证 — 让决策者信服"建议是对的"
 * 结构: 判断依据(数据) → 不处理后果(量化) → 多方案比选(重算) → 推荐+理由 → 预期效果 → 数据来源
 */
import { buildMonthlySeries, STOCKPILE, type CutZone, type FillZone, type MonthPoint } from '@/data/construction'

const SPOIL_LAND = 8 // 中转/弃渣场扩容占地综合单价 元/m³库容

export interface DecisionOption { name: string; effect: string; cost: string; feasible: string; recommended: boolean }
export interface DecisionDetail {
  basis: string[]
  consequence: string
  options: DecisionOption[]
  recommendation: string
  expected: string
  sources: string[]
}

function peakOf(s: MonthPoint[]) { return Math.max(...s.map((p) => p.stock)) }
function peakWithShift(cut: CutZone[], fill: FillZone[], zoneId: string, startShift: number, durFactor = 1): number {
  const ap = (z: any) => { if (z.id === zoneId) { z.startMonth = Math.max(0, z.startMonth + startShift); z.durMonth = Math.max(3, Math.round(z.durMonth * durFactor)) } }
  const c2 = cut.map((z) => ({ ...z })); const f2 = fill.map((z) => ({ ...z }))
  c2.forEach(ap); f2.forEach(ap)
  return peakOf(buildMonthlySeries(c2, f2))
}

export function buildDecisionDetail(
  type: string, cut: CutZone[], fill: FillZone[], series: MonthPoint[],
  ctx: { borrowM3: number; spoilRate: number; buyPrice: number; spoilPrice: number; peakMonthLabel: string }
): DecisionDetail {
  const cap = STOCKPILE.capacityM3

  if (type === '中转场超容' || type === '中转场临界') {
    const base = peakOf(series)
    const gap = +(base - cap).toFixed(0)
    // 方案重算
    const pEarlyFill = peakWithShift(cut, fill, 'upperDam', -3) // 坝体填筑提前3月,加快回采
    const pSlowCut = peakWithShift(cut, fill, 'upper', 3) // 上库开挖推迟3月,放缓进料
    const expandCost = +(Math.max(0, gap) * SPOIL_LAND).toFixed(0)
    const opts: DecisionOption[] = [
      { name: '①中转场扩容', effect: `容量提至 ${base.toFixed(0)} 万m³,彻底消除超容`, cost: `扩容占地约 ${expandCost} 万元`, feasible: '需用地审批,周期较长', recommended: false },
      { name: '②坝体填筑提前(回采上坝)', effect: `堆存峰值 ${base.toFixed(0)} → ${pEarlyFill.toFixed(0)} 万m³`, cost: '基本不增成本,需坝基提前具备填筑条件', feasible: pEarlyFill <= cap ? '可达标 ✓' : '仍超容,需配合其它', recommended: pEarlyFill <= cap },
      { name: '③放缓上游开挖', effect: `堆存峰值 ${base.toFixed(0)} → ${pSlowCut.toFixed(0)} 万m³`, cost: '开挖进度后延,可能影响总工期', feasible: pSlowCut <= cap ? '可达标 ✓' : '仍超容', recommended: pEarlyFill > cap && pSlowCut <= cap }
    ]
    const rec = opts.find((o) => o.recommended) || opts[0]
    return {
      basis: [
        `按各工区开工/工期计划逐月推演,中转堆存峰值达 ${base.toFixed(0)} 万m³,出现在 ${ctx.peakMonthLabel}`,
        `中转料场设计容量 ${cap} 万m³,缺口 ${Math.max(0, gap)} 万m³`,
        '成因:上游开挖产料早于坝体填筑需求(时间错配),富余料持续进中转'
      ],
      consequence: `若不处理:约 ${Math.max(0, gap)} 万m³ 富余料无处堆存,被迫临时占地或逼停开挖,预计影响开挖连续性、产生窝工与二次倒运费用`,
      options: opts,
      recommendation: `推荐【${rec.name}】:${rec.recommended ? '在不显著增加成本/工期的前提下使堆存峰值回落至容量内' : '综合代价与可行性最优'}`,
      expected: rec.name.includes('提前') ? `峰值由 ${base.toFixed(0)} 降至 ${pEarlyFill.toFixed(0)} 万m³,回到容量 ${cap} 以内,避免窝工` : `消除 ${Math.max(0, gap)} 万m³ 超容风险`,
      sources: ['逐月时空平衡序列(调配计划/时空平衡)', '中转场容量(基础资料)', '各工区开工/工期(基础资料/导入台账)']
    }
  }

  if (type === '料源缺口') {
    const gap = ctx.borrowM3
    const extraCost = +(gap * ctx.buyPrice).toFixed(0)
    const saveByUtil = +(gap * 0.5 * ctx.buyPrice).toFixed(0)
    const opts: DecisionOption[] = [
      { name: '①直接外购/加工', effect: `补足 ${gap} 万m³ 缺口`, cost: `外购支出约 ${extraCost} 万元`, feasible: '即时可行', recommended: false },
      { name: '②提高开挖料利用率', effect: `挑选弃渣中可用料,预计减少缺口约一半`, cost: `增加筛分加工费,净省约 ${saveByUtil} 万元`, feasible: '需筛分设备与质检', recommended: true },
      { name: '③提前开挖供料', effect: '调整开挖顺序优先供料', cost: '需协调开挖工作面', feasible: '视现场工作面', recommended: false }
    ]
    return {
      basis: [`推演显示 ${ctx.peakMonthLabel} 累计填筑需求超过累计可利用开挖,缺口 ${gap} 万m³`, '成因:相容料源(料质/时间)不足以满足该阶段填筑'],
      consequence: `若不处理:需外购/加工 ${gap} 万m³ 填料,增加成本约 ${extraCost} 万元,且受料场供应能力制约可能影响填筑进度`,
      options: opts,
      recommendation: '推荐【②提高开挖料利用率】:优先内部挖潜,减少外购,综合成本最低',
      expected: `预计减少外购约 ${(gap * 0.5).toFixed(0)} 万m³,节省约 ${saveByUtil} 万元`,
      sources: ['逐月供需序列(时空平衡)', '料质相容规则(基础资料)', '调配算法 KPI']
    }
  }

  // 弃方率偏高 / 其它
  return {
    basis: [`当前弃方率 ${ctx.spoilRate}%,高于经验阈值`, '部分可利用料因无相容/就近填筑去向而拟弃渣'],
    consequence: `弃方每增 1 万m³,增加处置费约 ${ctx.spoilPrice} 万元,并占用弃渣场容量`,
    options: [
      { name: '①改填相容它区', effect: '将富余可用料改填其它坝段/路基', cost: '增加运距', feasible: '视料质与去向', recommended: true },
      { name: '②原地暂存待用', effect: '进中转待后期使用', cost: '占用中转容量', feasible: '视中转余量', recommended: false }
    ],
    recommendation: '推荐【①改填相容它区】:在可接受运距内提高利用率、降低弃方率',
    expected: '弃方率下降,弃渣处置费与占地减少',
    sources: ['调配算法(弃方率)', '料质相容规则(基础资料)']
  }
}
