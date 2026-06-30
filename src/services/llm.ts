/**
 * LLM 适配器 — 可选接入真实大模型 API 的"接入位"
 *
 * 诚实说明:
 *  - 本前端默认【不】调用任何外部大模型,所有问答/报告均由本地确定性引擎
 *    (logic/aiAssistant.ts)基于真实模型计算结果生成,可复现、可追溯、无幻觉。
 *  - 若你已有大模型服务(OpenAI / 通义千问 / 文心 / DeepSeek 等),可在此处接入:
 *    需要一个【后端代理】转发请求(避免在前端暴露 API Key),前端只调用自己的后端。
 *  - 关键防幻觉原则:大模型只负责"把已算好的数字润色成更自然的表达",
 *    数字本身永远以本地计算为准,不让模型自由发挥编造数据。
 */

export interface LLMConfig {
  enabled: boolean // 是否启用真实大模型
  endpoint: string // 你自己的后端代理地址,例如 /api/llm/chat
  model: string // 模型名,仅作展示/透传
}

/** 默认配置:本地模式(不调外部模型) */
export const llmConfig: LLMConfig = {
  enabled: false,
  endpoint: '/api/llm/chat',
  model: 'local-deterministic'
}

export interface LLMResult {
  text: string
  source: 'local' | 'llm'
}

/**
 * 用大模型对"已生成的确定性文本"做表达润色(可选)。
 * - 输入 systemFacts:本地引擎产出的事实性文本(含真实数字),作为唯一事实来源。
 * - 输入 userQuery:用户的自然语言问题。
 * - 约定后端 system prompt 强制:仅可基于 systemFacts 回答,不得新增/篡改任何数字。
 * 若未启用或请求失败,则原样返回本地文本(降级保证可用)。
 */
export async function refineWithLLM(
  userQuery: string,
  systemFacts: string
): Promise<LLMResult> {
  if (!llmConfig.enabled) {
    return { text: systemFacts, source: 'local' }
  }
  try {
    const resp = await fetch(llmConfig.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: llmConfig.model,
        query: userQuery,
        facts: systemFacts,
        // 后端据此构造 system prompt:严格基于 facts、禁止编造数字
        guard: 'answer-only-from-facts'
      })
    })
    if (!resp.ok) throw new Error(`LLM ${resp.status}`)
    const data = await resp.json()
    const text = typeof data?.text === 'string' && data.text.trim() ? data.text : systemFacts
    return { text, source: 'llm' }
  } catch (e) {
    // 失败降级到本地确定性文本,保证始终可用
    return { text: systemFacts, source: 'local' }
  }
}
