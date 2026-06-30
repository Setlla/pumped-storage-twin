<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { useAllocationConfig } from '@/stores/allocationConfig'
import { useAlertStore } from '@/stores/alerts'
import { computeAllocation } from '@/logic/allocation'
import { computeForecast } from '@/logic/forecast'
import { computeDeviation } from '@/logic/deviation'
import { computeAlerts } from '@/logic/alerts'
import { buildDecisionDetail } from '@/logic/decisions'
import { monthLabel } from '@/data/construction'
import { ElDrawer } from 'element-plus'
import '@/styles/panel.css'

const c = useConstructionStore()
const cfg = useAllocationConfig()
const a = useAlertStore()

// 经济测算单价(可调)
const BUY = 48 // 外购/加工料 元/m³
const SPOIL = 20 // 弃渣外运+占地+环保 元/m³

const alloc = computed(() => computeAllocation(c.cutZones, c.fillZones, {
  truckCapacityM3: cfg.truckCapacityM3, costPerKmPerTrip: cfg.costPerKmPerTrip,
  stockpileLeadMonth: cfg.stockpileLeadMonth, strategy: cfg.strategy
}))
const fc = computed(() => computeForecast(c.series, c.currentMonth))

// 价值测算(万元):万m³ × 元/m³ = 万元
const reuseVol = computed(() => Math.max(0, c.fillPlan - alloc.value.kpi.borrowM3)) // 就地利用上坝
const saveBuy = computed(() => +(reuseVol.value * BUY).toFixed(0)) // 替代外购价值
const spoilCost = computed(() => +(c.spoilUsed * SPOIL).toFixed(0)) // 弃渣支出
const haulCost = computed(() => alloc.value.kpi.totalCostWan)
const borrowCost = computed(() => +(alloc.value.kpi.borrowM3 * BUY).toFixed(0))
// 综合效益 = 就地利用替代外购 - 弃渣支出 - 外购支出 - 运输支出
const netBenefit = computed(() => +(saveBuy.value - spoilCost.value - borrowCost.value - haulCost.value).toFixed(0))

function wan(v: number) { return v >= 10000 ? (v / 10000).toFixed(2) + ' 亿' : v + ' 万' }

// 决策建议(由风险+缺口翻译为"影响+行动")
const decisions = computed(() => {
  const list: { level: 'crit' | 'warn' | 'ok'; type: string; title: string; impact: string; action: string }[] = []
  fc.value.risks.forEach((r) => {
    if (r.type === '中转场超容') list.push({ level: 'crit', type: r.type, title: `${monthLabel(r.month)} 中转料场将爆仓`, impact: `超出无处堆存(${r.value}),可能逼停开挖、窝工`, action: r.suggest })
    else if (r.type === '料源缺口') list.push({ level: 'crit', type: r.type, title: `${monthLabel(r.month)} 出现料源缺口`, impact: `需外购约 ${alloc.value.kpi.borrowM3} 万m³,增加成本约 ${wan(borrowCost.value)}元`, action: r.suggest })
    else if (r.type === '弃渣场超容') list.push({ level: 'crit', type: r.type, title: `${monthLabel(r.month)} 弃渣场将满`, impact: `${r.value},无处弃渣`, action: r.suggest })
    else if (r.type === '中转场临界') list.push({ level: 'warn', type: r.type, title: '中转堆存接近上限', impact: r.value, action: r.suggest })
  })
  if (alloc.value.kpi.spoilRate > 25) list.push({ level: 'warn', type: '弃方率', title: `弃方率偏高 ${alloc.value.kpi.spoilRate}%`, impact: `多弃 1 万m³ ≈ 多花 ${SPOIL} 万元处置费`, action: '复核可利用料去向,改填它区以降弃方' })
  if (list.length === 0) list.push({ level: 'ok', type: 'ok', title: '当前计划时空平衡可控', impact: '未来无显著超容/缺口', action: '保持滚动跟踪,按计划推进' })
  return list
})
const critCount = computed(() => decisions.value.filter((d) => d.level === 'crit').length)

// 决策论证抽屉
const drawer = ref(false)
const selType = ref('')
const selTitle = ref('')
const detail = computed(() => buildDecisionDetail(selType.value, c.cutZones, c.fillZones, c.series, {
  borrowM3: alloc.value.kpi.borrowM3, spoilRate: alloc.value.kpi.spoilRate,
  buyPrice: BUY, spoilPrice: SPOIL, peakMonthLabel: monthLabel(fc.value.peakStockMonth)
}))
function openDecision(d: { type: string; title: string }) {
  if (d.type === 'ok') return
  selType.value = d.type; selTitle.value = d.title; drawer.value = true
}
</script>


<template>
  <div class="vc-wrap">
    <!-- 一句话价值结论 -->
    <div class="hero">
      <div class="hero-main">
        <div class="hl">土石方综合平衡 · 预计净效益</div>
        <div class="hv" :class="netBenefit >= 0 ? 'pos' : 'neg'">{{ netBenefit >= 0 ? '+' : '' }}{{ wan(netBenefit) }}<span>元</span></div>
        <div class="hsub">就地利用 {{ reuseVol.toFixed(0) }} 万m³(替代外购)· 综合利用率 {{ c.utilizationRate.toFixed(0) }}% · 直接上坝率 {{ alloc.kpi.directRate }}%</div>
      </div>
      <div class="hero-side" :class="critCount ? 'alarm' : 'good'">
        <div class="hs-n">{{ critCount }}</div>
        <div class="hs-l">项需立即决策</div>
      </div>
    </div>

    <!-- 算账:钱花在哪、省在哪 -->
    <div class="econ">
      <div class="ec good"><div class="ec-l">就地利用替代外购</div><div class="ec-v">+{{ wan(saveBuy) }}<small>元</small></div><div class="ec-d">{{ reuseVol.toFixed(0) }} 万m³ × {{ BUY }} 元/m³</div></div>
      <div class="ec bad"><div class="ec-l">弃渣处置支出</div><div class="ec-v">−{{ wan(spoilCost) }}<small>元</small></div><div class="ec-d">{{ c.spoilUsed.toFixed(0) }} 万m³ × {{ SPOIL }} 元/m³</div></div>
      <div class="ec bad"><div class="ec-l">外购/加工支出</div><div class="ec-v">−{{ wan(borrowCost) }}<small>元</small></div><div class="ec-d">{{ alloc.kpi.borrowM3 }} 万m³ × {{ BUY }} 元/m³</div></div>
      <div class="ec bad"><div class="ec-l">场内运输支出</div><div class="ec-v">−{{ wan(haulCost) }}<small>元</small></div><div class="ec-d">{{ (alloc.kpi.totalTrips/10000).toFixed(1) }} 万车次 · 均距 {{ alloc.kpi.avgHaulKm }}km</div></div>
    </div>

    <!-- 决策建议 -->
    <section class="panel dec-panel">
      <div class="panel-header"><span class="panel-title">关键决策建议</span><span class="metric-label">按影响排序 · 截至 {{ c.monthText }}</span></div>
      <div class="dec-list">
        <div v-for="(d, i) in decisions" :key="i" class="dec" :class="[d.level, { clickable: d.level !== 'ok' }]" @click="openDecision(d)">
          <div class="dec-icon">{{ d.level === 'crit' ? '🔴' : d.level === 'warn' ? '🟡' : '🟢' }}</div>
          <div class="dec-body">
            <div class="dec-title">{{ d.title }}</div>
            <div class="dec-impact">影响:{{ d.impact }}</div>
            <div class="dec-action">建议:<b>{{ d.action }}</b></div>
          </div>
          <div v-if="d.level !== 'ok'" class="dec-more">查看依据 →</div>
        </div>
      </div>
    </section>

    <div class="vc-note">说明:经济效益为测算(外购 {{ BUY }} 元/m³、弃渣 {{ SPOIL }} 元/m³,单价可调);接入真实台账后即为本项目实际测算。净效益 = 就地利用替代外购 − 弃渣 − 外购 − 运输。</div>

    <!-- 决策论证抽屉 -->
    <ElDrawer v-model="drawer" :title="selTitle" size="48%" direction="rtl" class="arg-drawer">
      <div v-if="detail" class="arg">
        <div class="arg-tag">决策论证 · 为什么这么建议</div>

        <div class="arg-sec">
          <div class="arg-h"><span class="num">1</span>判断依据(数据)</div>
          <ul class="arg-list">
            <li v-for="(b, i) in detail.basis" :key="i">{{ b }}</li>
          </ul>
        </div>

        <div class="arg-sec danger">
          <div class="arg-h"><span class="num">2</span>若不处理的后果</div>
          <div class="arg-text">{{ detail.consequence }}</div>
        </div>

        <div class="arg-sec">
          <div class="arg-h"><span class="num">3</span>多方案比选(模型重算)</div>
          <table class="arg-table">
            <thead><tr><th>方案</th><th>效果</th><th>代价</th><th>可行性</th></tr></thead>
            <tbody>
              <tr v-for="(o, i) in detail.options" :key="i" :class="{ rec: o.recommended }">
                <td>{{ o.name }}<span v-if="o.recommended" class="badge">推荐</span></td>
                <td>{{ o.effect }}</td>
                <td>{{ o.cost }}</td>
                <td>{{ o.feasible }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="arg-sec rec-sec">
          <div class="arg-h"><span class="num">4</span>推荐结论</div>
          <div class="arg-text strong">{{ detail.recommendation }}</div>
          <div class="arg-expect">预期效果:{{ detail.expected }}</div>
        </div>

        <div class="arg-sec">
          <div class="arg-h"><span class="num">5</span>数据来源(可追溯)</div>
          <div class="arg-sources">
            <span v-for="(s, i) in detail.sources" :key="i" class="src">{{ s }}</span>
          </div>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<style scoped>
.vc-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 12px; padding: 14px; background: #061222; overflow: auto; }
.hero { display: flex; gap: 12px; flex-shrink: 0; }
.hero-main { flex: 1; background: linear-gradient(135deg, rgba(0,212,255,0.12), rgba(8,22,42,0.6)); border: 1px solid var(--border-line-strong); border-radius: 8px; padding: 18px 22px; }
.hl { font-size: 14px; color: var(--text-secondary); letter-spacing: 1px; }
.hv { font-size: 44px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.2; }
.hv.pos { color: var(--accent-green); text-shadow: 0 0 18px rgba(0,255,136,0.4); }
.hv.neg { color: var(--accent-red); }
.hv span { font-size: 18px; margin-left: 4px; }
.hsub { font-size: 13px; color: var(--text-primary); margin-top: 4px; }
.hero-side { width: 180px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid; }
.hero-side.alarm { background: rgba(255,56,96,0.1); border-color: var(--accent-red); }
.hero-side.good { background: rgba(0,255,136,0.08); border-color: var(--accent-green); }
.hs-n { font-size: 48px; font-weight: 800; }
.hero-side.alarm .hs-n { color: var(--accent-red); }
.hero-side.good .hs-n { color: var(--accent-green); }
.hs-l { font-size: 13px; color: var(--text-secondary); }
.econ { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex-shrink: 0; }
.ec { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 12px 14px; border-left-width: 3px; }
.ec.good { border-left-color: var(--accent-green); }
.ec.bad { border-left-color: var(--accent-orange); }
.ec-l { font-size: 12px; color: var(--text-secondary); }
.ec-v { font-size: 22px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; margin: 2px 0; }
.ec-v small { font-size: 11px; color: var(--text-dim); margin-left: 2px; }
.ec-d { font-size: 11px; color: var(--text-dim); }
.dec-panel { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.dec-list { overflow: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.dec { display: flex; gap: 12px; padding: 12px 14px; border-radius: 6px; border-left: 3px solid; }
.dec.crit { border-color: var(--accent-red); background: rgba(255,56,96,0.07); }
.dec.warn { border-color: var(--accent-orange); background: rgba(255,157,0,0.06); }
.dec.ok { border-color: var(--accent-green); background: rgba(0,255,136,0.05); }
.dec-icon { font-size: 18px; }
.dec-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.dec-impact { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
.dec-action { font-size: 13px; color: var(--text-primary); margin-top: 3px; }
.dec-action b { color: var(--accent-cyan); }
.dec.clickable { cursor: pointer; transition: transform .12s, box-shadow .12s; }
.dec.clickable:hover { transform: translateX(2px); box-shadow: -2px 0 0 0 var(--accent-cyan); }
.dec-more { align-self: center; font-size: 12px; color: var(--accent-cyan); white-space: nowrap; opacity: .8; }

/* 决策论证抽屉 */
.arg { display: flex; flex-direction: column; gap: 14px; color: var(--text-primary); }
.arg-tag { font-size: 12px; color: var(--accent-cyan); letter-spacing: 1px; border-left: 3px solid var(--accent-cyan); padding-left: 8px; }
.arg-sec { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 12px 14px; }
.arg-sec.danger { border-color: rgba(255,56,96,0.4); background: rgba(255,56,96,0.05); }
.arg-sec.rec-sec { border-color: var(--accent-green); background: rgba(0,255,136,0.05); }
.arg-h { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.arg-h .num { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--accent-cyan); color: #061222; font-size: 12px; font-weight: 800; }
.arg-list { margin: 0; padding-left: 18px; }
.arg-list li { font-size: 13px; line-height: 1.7; color: var(--text-secondary); }
.arg-text { font-size: 13px; line-height: 1.7; color: var(--text-secondary); }
.arg-text.strong { color: var(--text-primary); font-weight: 600; }
.arg-expect { font-size: 13px; color: var(--accent-green); margin-top: 6px; }
.arg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.arg-table th, .arg-table td { border: 1px solid var(--border-line); padding: 7px 9px; text-align: left; vertical-align: top; color: var(--text-secondary); }
.arg-table th { background: rgba(255,255,255,0.04); color: var(--text-primary); }
.arg-table tr.rec td { background: rgba(0,255,136,0.07); color: var(--text-primary); }
.badge { display: inline-block; margin-left: 6px; font-size: 10px; background: var(--accent-green); color: #061222; border-radius: 3px; padding: 1px 5px; font-weight: 700; }
.arg-sources { display: flex; flex-wrap: wrap; gap: 8px; }
.src { font-size: 12px; background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); color: var(--accent-cyan); border-radius: 4px; padding: 3px 8px; }
.vc-note { flex-shrink: 0; font-size: 11px; color: var(--text-dim); line-height: 1.6; border-top: 1px solid var(--border-line); padding-top: 8px; }
</style>

<!-- 全局样式:抽屉为 teleport 内容,scoped 够不到,需用非 scoped 覆盖为深色主题 -->
<style>
.arg-drawer.el-drawer { background-color: #0a1a30; }
.arg-drawer .el-drawer__header {
  margin-bottom: 0; padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #e8f2ff;
}
.arg-drawer .el-drawer__title { color: #e8f2ff; font-size: 15px; font-weight: 700; }
.arg-drawer .el-drawer__close-btn,
.arg-drawer .el-drawer__close-btn .el-icon { color: #9fb3c8; }
.arg-drawer .el-drawer__close-btn:hover .el-icon { color: var(--accent-cyan); }
.arg-drawer .el-drawer__body { background-color: #0a1a30; color: #cfe0f5; padding: 18px 20px; }
</style>
