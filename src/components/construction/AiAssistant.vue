<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { useAllocationConfig } from '@/stores/allocationConfig'
import { computeAllocation } from '@/logic/allocation'
import { computeForecast } from '@/logic/forecast'
import { TOTAL_MONTHS, STOCKPILE, SPOIL_YARD } from '@/data/construction'
import {
  answerQuery, generateReport, QUICK_QUESTIONS,
  type AssistantContext, type AssistantAnswer
} from '@/logic/aiAssistant'
import { refineWithLLM, llmConfig } from '@/services/llm'

const c = useConstructionStore()
const cfg = useAllocationConfig()

const BUY = 48
const SPOIL = 20

const alloc = computed(() => computeAllocation(c.cutZones, c.fillZones, {
  truckCapacityM3: cfg.truckCapacityM3, costPerKmPerTrip: cfg.costPerKmPerTrip,
  stockpileLeadMonth: cfg.stockpileLeadMonth, strategy: cfg.strategy
}))
const fc = computed(() => computeForecast(c.series, c.currentMonth))

// 组装真实上下文(全部为已算好的数值)
const ctx = computed<AssistantContext>(() => ({
  monthText: c.monthText,
  currentMonth: c.currentMonth,
  totalMonths: TOTAL_MONTHS,
  overallProgress: c.overallProgress,
  utilizationRate: c.utilizationRate,
  balanceRate: c.balanceRate,
  cutPlan: c.cutPlan,
  fillPlan: c.fillPlan,
  usablePlan: c.usablePlan,
  surplus: c.surplus,
  stockNow: c.stockNow,
  stockCap: STOCKPILE.capacityM3,
  spoilUsed: c.spoilUsed,
  spoilCap: SPOIL_YARD.capacityM3,
  borrowUsed: c.borrowUsed,
  forecast: fc.value,
  kpi: alloc.value.kpi,
  buyPrice: BUY,
  spoilPrice: SPOIL
}))

interface Msg { role: 'user' | 'ai'; title?: string; text: string; refs?: string[]; src?: 'local' | 'llm' }
const msgs = ref<Msg[]>([{
  role: 'ai',
  title: '你好,我是土石方平衡 AI 助手',
  text: '我基于本项目的时空平衡、调配、预判、决策论证模型实时取数,可以用大白话回答你的问题,也能一键生成决策简报。\n试着问我:进度、料源缺口、中转堆存、成本效益、风险、该做什么决策。',
  refs: []
}])
const input = ref('')
const busy = ref(false)
const scroller = ref<HTMLElement | null>(null)

async function scrollBottom() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function send(q?: string) {
  const query = (q ?? input.value).trim()
  if (!query || busy.value) return
  msgs.value.push({ role: 'user', text: query })
  input.value = ''
  busy.value = true
  await scrollBottom()

  // 1) 本地确定性引擎取数 → 事实文本(真实数字)
  const ans: AssistantAnswer = answerQuery(query, ctx.value)
  const facts = ans.text
  // 2) 可选:大模型润色(默认本地;数字以本地为准)
  const refined = await refineWithLLM(query, facts)

  msgs.value.push({
    role: 'ai',
    title: ans.title,
    text: refined.text,
    refs: ans.refs,
    src: refined.source
  })
  busy.value = false
  await scrollBottom()
}

// 报告
const report = ref('')
const showReport = ref(false)
const copied = ref(false)
function makeReport() {
  report.value = generateReport(ctx.value)
  showReport.value = true
}
async function copyReport() {
  try {
    await navigator.clipboard.writeText(report.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch (e) { /* ignore */ }
}
</script>

<template>
  <div class="ai-wrap">
    <!-- 左:对话问数 -->
    <section class="chat">
      <div class="chat-head">
        <span class="ch-title">🤖 AI 助手 · 自然语言问数</span>
        <span class="ch-mode" :class="llmConfig.enabled ? 'on' : 'off'">
          {{ llmConfig.enabled ? '大模型增强' : '本地确定性' }}
        </span>
      </div>

      <div ref="scroller" class="chat-body">
        <div v-for="(m, i) in msgs" :key="i" class="msg" :class="m.role">
          <div class="bubble">
            <div v-if="m.title" class="b-title">{{ m.title }}</div>
            <div class="b-text">{{ m.text }}</div>
            <div v-if="m.refs && m.refs.length" class="b-refs">
              <span class="rf-label">数据来源</span>
              <span v-for="(r, k) in m.refs" :key="k" class="rf">{{ r }}</span>
            </div>
            <div v-if="m.role === 'ai' && m.src" class="b-src">
              {{ m.src === 'llm' ? '大模型润色 · 数字来自模型计算' : '本地生成 · 数字来自模型计算' }}
            </div>
          </div>
        </div>
        <div v-if="busy" class="msg ai"><div class="bubble typing">正在取数…</div></div>
      </div>

      <div class="quick">
        <button v-for="(q, i) in QUICK_QUESTIONS" :key="i" class="q-chip" @click="send(q)">{{ q }}</button>
      </div>

      <div class="input-row">
        <input
          v-model="input" class="ti" placeholder="问我:中转料场会不会超容?能省多少钱?…"
          @keyup.enter="send()"
        />
        <button class="send" :disabled="busy" @click="send()">发送</button>
      </div>
    </section>

    <!-- 右:一键生成报告 -->
    <section class="report">
      <div class="rp-head">
        <span class="rp-title">📄 决策简报 · 一键生成</span>
        <div class="rp-acts">
          <button class="rp-btn" @click="makeReport">生成简报</button>
          <button class="rp-btn ghost" :disabled="!showReport" @click="copyReport">
            {{ copied ? '已复制 ✓' : '复制' }}
          </button>
        </div>
      </div>
      <div class="rp-body">
        <pre v-if="showReport" class="rp-pre">{{ report }}</pre>
        <div v-else class="rp-empty">
          <div class="rp-empty-ic">📝</div>
          <div>点击「生成简报」,系统将基于当前时空平衡、调配、预判、决策论证模型,<br/>自动汇总成一份给决策者看的简报。</div>
        </div>
      </div>
      <div class="ai-note">
        说明:AI 助手不自行编造数据——所有数字均来自本项目模型实时计算,可在「决策驾驶舱/时空平衡/进度预判」核对。
        默认本地确定性生成;如接入大模型 API(需后端代理),仅用于润色表达,数字仍以模型计算为准(防幻觉)。
      </div>
    </section>
  </div>
</template>

<style scoped>
.ai-wrap { width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px; background: #061222; overflow: hidden; }
section { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 8px; display: flex; flex-direction: column; min-height: 0; }

/* 对话 */
.chat-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-line); }
.ch-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.ch-mode { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.ch-mode.off { color: var(--accent-cyan); border: 1px solid rgba(0,212,255,0.4); background: rgba(0,212,255,0.08); }
.ch-mode.on { color: #061222; background: var(--accent-green); }
.chat-body { flex: 1; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.bubble { max-width: 86%; border-radius: 8px; padding: 10px 13px; font-size: 13px; line-height: 1.7; }
.msg.ai .bubble { background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.2); color: var(--text-primary); }
.msg.user .bubble { background: linear-gradient(135deg, var(--accent-cyan), #0099ff); color: #061222; font-weight: 500; }
.b-title { font-weight: 700; margin-bottom: 4px; color: var(--accent-cyan); }
.b-text { white-space: pre-wrap; }
.b-refs { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.rf-label { font-size: 10px; color: var(--text-dim); }
.rf { font-size: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-line); color: var(--text-secondary); border-radius: 3px; padding: 1px 6px; }
.b-src { margin-top: 6px; font-size: 10px; color: var(--text-dim); }
.typing { color: var(--text-secondary); font-style: italic; }
.quick { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px; border-top: 1px solid var(--border-line); }
.q-chip { font-size: 11px; color: var(--text-secondary); background: rgba(255,255,255,0.04); border: 1px solid var(--border-line); border-radius: 12px; padding: 4px 10px; cursor: pointer; transition: all .15s; }
.q-chip:hover { color: var(--accent-cyan); border-color: var(--accent-cyan); }
.input-row { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border-line); }
.ti { flex: 1; background: #08162a; border: 1px solid var(--border-line); border-radius: 6px; color: var(--text-primary); padding: 9px 12px; font-size: 13px; outline: none; }
.ti:focus { border-color: var(--accent-cyan); }
.send { background: linear-gradient(135deg, var(--accent-cyan), #0099ff); color: #061222; font-weight: 600; border: none; border-radius: 6px; padding: 0 18px; cursor: pointer; }
.send:disabled { opacity: .5; cursor: not-allowed; }

/* 报告 */
.rp-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-line); }
.rp-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.rp-acts { display: flex; gap: 8px; }
.rp-btn { background: linear-gradient(135deg, var(--accent-cyan), #0099ff); color: #061222; font-weight: 600; border: none; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer; }
.rp-btn.ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-line); }
.rp-btn:disabled { opacity: .5; cursor: not-allowed; }
.rp-body { flex: 1; overflow: auto; padding: 14px; }
.rp-pre { white-space: pre-wrap; font-family: 'Consolas', monospace; font-size: 12px; line-height: 1.75; color: var(--text-primary); margin: 0; }
.rp-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--text-dim); font-size: 13px; text-align: center; line-height: 1.7; }
.rp-empty-ic { font-size: 40px; opacity: .6; }
.ai-note { flex-shrink: 0; font-size: 11px; color: var(--text-dim); line-height: 1.6; border-top: 1px solid var(--border-line); padding: 10px 14px; }
</style>
