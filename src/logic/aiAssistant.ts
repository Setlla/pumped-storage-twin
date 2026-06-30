/**
 * AI 助手引擎 — 自然语言问数 + 决策论证报告生成
 *
 * 设计原则(诚实第一):
 *  - 所有"数字"均来自项目真实模型计算(时空平衡序列 / 调配算法 / 预判 / 决策论证),
 *    本引擎只负责"取数 + 组织成人话",绝不编造或臆测数据。
 *  - 默认走本地确定性 NLG(模板化自然语言生成),输出可复现、可追溯;
 *    如配置了真实大模型 API(见 services/llm.ts),则由大模型润色表达,
 *    但数字仍以本地计算为准(防幻觉)。
 */
import type { ForecastResult } from './forecast'

/** 引擎所需上下文:全部为已算好的真实数值 */
export interface AssistantContext {
  monthText: string
  currentMonth: number
  totalMonths: number
  overallProgress: number // %
  utilizationRate: number // 综合利用率 %
  balanceRate: number // 自平衡率 %
  cutPlan: number // 计划开挖 万m³
  fillPlan: number // 计划填筑 万m³
  usablePlan: number // 可利用方量 万m³
  surplus: number // 余缺 万m³
  stockNow: number // 当前堆存 万m³
  stockCap: number // 中转容量 万m³
  spoilUsed: number // 已弃渣 万m³
  spoilCap: number // 弃渣容量 万m³
  borrowUsed: number // 外购/加工 万m³
  // 模型计算结果
  forecast: ForecastResult
  kpi: {
    directRate: number
    spoilRate: number
    avgHaulKm: number
    totalTrips: number
    totalCostWan: number
    borrowM3: number
    stockpileM3: number
  }
  // 经济测算单价
  buyPrice: number // 元/m³
  spoilPrice: number // 元/m³
}

export interface AssistantAnswer {
  title: string
  text: string
  refs: string[] // 数据来源(可追溯)
}

function wan(v: number): string {
  return v >= 10000 ? (v / 10000).toFixed(2) + ' 亿' : Math.round(v) + ' 万'
}

/* ============ 问数:意图识别 + 取数应答 ============ */

interface Intent {
  keys: string[]
  build: (c: AssistantContext) => AssistantAnswer
}

const INTENTS: Intent[] = [
  {
    keys: ['进度', '完成', '到哪', '百分', '工期', '多少了'],
    build: (c) => ({
      title: '总体进度',
      text: `截至 ${c.monthText},工程总体进度约 ${c.overallProgress.toFixed(0)}%(第 ${Math.round(c.currentMonth)}/${c.totalMonths} 月)。`
        + `累计计划开挖 ${c.cutPlan.toFixed(0)} 万m³、计划填筑 ${c.fillPlan.toFixed(0)} 万m³,`
        + `其中可利用料 ${c.usablePlan.toFixed(0)} 万m³,综合利用率 ${c.utilizationRate.toFixed(0)}%。`,
      refs: ['逐月时空平衡序列', '基础资料(工区开工/工期)']
    })
  },
  {
    keys: ['缺口', '缺料', '料源', '外购', '不够', '差多少'],
    build: (c) => {
      const cost = c.kpi.borrowM3 * c.buyPrice
      const deficit = c.forecast.risks.find((r) => r.type === '料源缺口')
      return {
        title: '料源缺口',
        text: deficit
          ? `预判在 ${monthOf(deficit.month, c)} 出现料源缺口(${deficit.value}),`
            + `按当前调配方案需外购/加工约 ${c.kpi.borrowM3} 万m³,增加成本约 ${wan(cost)}元。建议:${deficit.suggest}`
          : `当前计划下未来无显著料源缺口;调配方案中外购/加工量约 ${c.kpi.borrowM3} 万m³(主要为垫层/过渡料等需专门加工的料),成本约 ${wan(cost)}元。`,
        refs: ['进度预判(forecast)', '调配算法 KPI', '料质相容规则']
      }
    }
  },
  {
    keys: ['中转', '堆存', '超容', '爆仓', '料场', '堆料', '峰值'],
    build: (c) => {
      const over = c.forecast.peakStock > c.stockCap
      return {
        title: '中转堆存',
        text: `当前中转堆存 ${c.stockNow.toFixed(0)} 万m³(容量 ${c.stockCap} 万m³,占用 ${((c.stockNow / c.stockCap) * 100).toFixed(0)}%)。`
          + `按计划推演,堆存峰值将达 ${c.forecast.peakStock} 万m³,出现在 ${monthOf(c.forecast.peakStockMonth, c)}。`
          + (over
            ? `⚠️ 峰值超出容量 ${(c.forecast.peakStock - c.stockCap).toFixed(0)} 万m³,需提前回采上坝或扩容,详见决策驾驶舱的论证。`
            : `峰值在容量内,暂无超容风险,保持滚动跟踪即可。`),
        refs: ['逐月时空平衡序列', '进度预判(forecast)', '中转场容量(基础资料)']
      }
    }
  },
  {
    keys: ['弃渣', '弃方', '弃土', '废料'],
    build: (c) => ({
      title: '弃渣/弃方',
      text: `当前累计弃渣 ${c.spoilUsed.toFixed(0)} 万m³(弃渣场容量 ${c.spoilCap} 万m³,占用 ${((c.spoilUsed / c.spoilCap) * 100).toFixed(0)}%),`
        + `调配方案测算弃方率约 ${c.kpi.spoilRate}%。`
        + (c.kpi.spoilRate > 25
          ? `弃方率偏高,每多弃 1 万m³约增处置费 ${c.spoilPrice} 万元,建议复核可利用料去向、改填相容它区以降低弃方。`
          : `弃方率处于合理区间。`),
      refs: ['调配算法(弃方率)', '弃渣场容量(基础资料)']
    })
  },
  {
    keys: ['成本', '钱', '效益', '省', '花', '经济', '预算', '运输'],
    build: (c) => {
      const reuseVol = Math.max(0, c.fillPlan - c.kpi.borrowM3)
      const saveBuy = reuseVol * c.buyPrice
      const spoilCost = c.spoilUsed * c.spoilPrice
      const borrowCost = c.kpi.borrowM3 * c.buyPrice
      const haul = c.kpi.totalCostWan
      const net = saveBuy - spoilCost - borrowCost - haul
      return {
        title: '经济效益测算',
        text: `综合测算净效益约 ${net >= 0 ? '+' : ''}${wan(net)}元。其中:就地利用 ${reuseVol.toFixed(0)} 万m³ 替代外购,价值约 +${wan(saveBuy)}元;`
          + `弃渣处置支出 −${wan(spoilCost)}元;外购/加工 −${wan(borrowCost)}元;场内运输 −${wan(haul)}元`
          + `(${(c.kpi.totalTrips / 10000).toFixed(1)} 万车次、均距 ${c.kpi.avgHaulKm}km)。单价为测算值(外购 ${c.buyPrice}、弃渣 ${c.spoilPrice} 元/m³),可调。`,
        refs: ['调配算法 KPI(车次/成本/运距)', '土石方平衡', '经济测算单价(可配置)']
      }
    }
  },
  {
    keys: ['风险', '预警', '问题', '隐患'],
    build: (c) => {
      const lines = c.forecast.risks.map((r, i) =>
        `${i + 1}. [${r.level === 'critical' ? '严重' : '关注'}] ${monthOf(r.month, c)} ${r.type}:${r.value} → ${r.suggest}`
      )
      return {
        title: '风险预判',
        text: c.forecast.risks.length
          ? `共识别 ${c.forecast.risks.length} 项时空平衡风险:\n` + lines.join('\n')
          : '当前计划下未来无显著超容/缺口风险。',
        refs: ['进度预判(forecast)', '逐月时空平衡序列']
      }
    }
  },
  {
    keys: ['建议', '怎么办', '决策', '措施', '该干', '处理'],
    build: (c) => {
      const crit = c.forecast.risks.filter((r) => r.level === 'critical')
      const lines = (crit.length ? crit : c.forecast.risks).map((r, i) => `${i + 1}. ${r.type}:${r.suggest}`)
      return {
        title: '决策建议',
        text: (crit.length
          ? `有 ${crit.length} 项需立即决策:\n`
          : `暂无须立即决策的严重项,常规建议:\n`) + lines.join('\n')
          + `\n(每条建议的判断依据/方案比选,可在「决策驾驶舱」点击对应决策卡查看完整论证)`,
        refs: ['决策论证(decisions)', '进度预判(forecast)']
      }
    }
  }
]

function monthOf(m: number, c: AssistantContext): string {
  // 复用 currentMonth→monthText 的偏移由调用方传 monthText;此处给出相对描述
  const diff = Math.round(m - c.currentMonth)
  if (diff <= 0) return '当前'
  return `约 ${diff} 个月后`
}

/** 概览(兜底应答) */
function overview(c: AssistantContext): AssistantAnswer {
  const crit = c.forecast.risks.filter((r) => r.level === 'critical').length
  return {
    title: '整体态势',
    text: `截至 ${c.monthText},总体进度 ${c.overallProgress.toFixed(0)}%,综合利用率 ${c.utilizationRate.toFixed(0)}%,`
      + `中转堆存 ${c.stockNow.toFixed(0)}/${c.stockCap} 万m³,弃方率 ${c.kpi.spoilRate}%。`
      + (crit ? `当前有 ${crit} 项需立即决策的风险,建议优先处置。` : `时空平衡总体可控。`)
      + `\n你可以问我:进度、料源缺口、中转堆存、弃渣、成本效益、风险、建议。`,
    refs: ['汇总自:时空平衡 / 调配 / 预判 / 决策论证']
  }
}

/** 自然语言问数主入口(本地确定性) */
export function answerQuery(query: string, c: AssistantContext): AssistantAnswer {
  const q = query.trim()
  if (!q) return overview(c)
  for (const it of INTENTS) {
    if (it.keys.some((k) => q.includes(k))) return it.build(c)
  }
  return overview(c)
}

/** 推荐的快捷问题 */
export const QUICK_QUESTIONS = [
  '现在总体进度怎么样?',
  '未来会出现料源缺口吗?',
  '中转料场会不会超容?',
  '这套方案能省多少钱?',
  '当前有哪些风险?',
  '我现在该做什么决策?'
]

/* ============ 决策论证报告 / 周报生成 ============ */

export function generateReport(c: AssistantContext): string {
  const reuseVol = Math.max(0, c.fillPlan - c.kpi.borrowM3)
  const saveBuy = reuseVol * c.buyPrice
  const spoilCost = c.spoilUsed * c.spoilPrice
  const borrowCost = c.kpi.borrowM3 * c.buyPrice
  const net = saveBuy - spoilCost - borrowCost - c.kpi.totalCostWan
  const crit = c.forecast.risks.filter((r) => r.level === 'critical')

  const L: string[] = []
  L.push(`# 土石方平衡 · 决策论证简报`)
  L.push(`数据截至:${c.monthText}(第 ${Math.round(c.currentMonth)}/${c.totalMonths} 月)`)
  L.push('')
  L.push(`## 一、一句话结论`)
  L.push(
    `当前计划下,土石方综合平衡预计净效益约 ${net >= 0 ? '+' : ''}${wan(net)}元,`
    + `综合利用率 ${c.utilizationRate.toFixed(0)}%;`
    + (crit.length ? `但有 ${crit.length} 项时空平衡风险需立即决策。` : `时空平衡总体可控。`)
  )
  L.push('')
  L.push(`## 二、关键指标`)
  L.push(`- 总体进度:${c.overallProgress.toFixed(0)}%`)
  L.push(`- 计划开挖 / 填筑:${c.cutPlan.toFixed(0)} / ${c.fillPlan.toFixed(0)} 万m³`)
  L.push(`- 可利用方量:${c.usablePlan.toFixed(0)} 万m³(利用率 ${c.utilizationRate.toFixed(0)}%)`)
  L.push(`- 中转堆存:${c.stockNow.toFixed(0)} / ${c.stockCap} 万m³,预判峰值 ${c.forecast.peakStock} 万m³`)
  L.push(`- 弃渣:${c.spoilUsed.toFixed(0)} / ${c.spoilCap} 万m³(弃方率 ${c.kpi.spoilRate}%)`)
  L.push(`- 外购/加工:${c.kpi.borrowM3} 万m³;直接上坝率 ${c.kpi.directRate}%`)
  L.push(`- 场内运输:${(c.kpi.totalTrips / 10000).toFixed(1)} 万车次,均距 ${c.kpi.avgHaulKm}km,成本约 ${wan(c.kpi.totalCostWan)}元`)
  L.push('')
  L.push(`## 三、经济测算(单价可调:外购 ${c.buyPrice}、弃渣 ${c.spoilPrice} 元/m³)`)
  L.push(`- 就地利用替代外购:+${wan(saveBuy)}元(${reuseVol.toFixed(0)} 万m³)`)
  L.push(`- 弃渣处置支出:−${wan(spoilCost)}元`)
  L.push(`- 外购/加工支出:−${wan(borrowCost)}元`)
  L.push(`- 场内运输支出:−${wan(c.kpi.totalCostWan)}元`)
  L.push(`- **净效益:${net >= 0 ? '+' : ''}${wan(net)}元**`)
  L.push('')
  L.push(`## 四、风险与决策建议`)
  if (c.forecast.risks.length) {
    c.forecast.risks.forEach((r, i) => {
      L.push(`${i + 1}. [${r.level === 'critical' ? '严重' : '关注'}] ${monthOf(r.month, c)} ${r.type}(${r.value})`)
      L.push(`   - 建议:${r.suggest}`)
    })
  } else {
    L.push(`暂无显著超容/缺口风险,保持滚动跟踪。`)
  }
  L.push('')
  L.push(`## 五、数据来源`)
  L.push(`逐月时空平衡序列、土石方调配算法、进度预判(forecast)、决策论证(decisions)、基础资料(工区计划/容量)。`)
  L.push('')
  L.push(`> 说明:本简报由系统基于模型计算自动生成,数字均来自上述模型;经济单价为测算值,接入真实台账后即为本项目实际测算。`)
  return L.join('\n')
}
