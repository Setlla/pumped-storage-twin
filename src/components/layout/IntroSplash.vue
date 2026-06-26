<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PLANT_INFO } from '@/data/plantConfig'

const emit = defineEmits<{ done: [] }>()

const progress = ref(0)
const phase = ref('初始化三维引擎')
const visible = ref(true)

const phases = [
  '初始化三维引擎',
  '加载云台山地形数据',
  '构建上 / 下水库模型',
  '装配 4×300MW 可逆机组',
  '接入电网调度与仿真',
  '系统就绪'
]

onMounted(() => {
  let p = 0
  const timer = setInterval(() => {
    p += Math.random() * 9 + 4
    if (p >= 100) {
      p = 100
      clearInterval(timer)
      setTimeout(() => {
        visible.value = false
        setTimeout(() => emit('done'), 600)
      }, 500)
    }
    progress.value = Math.floor(p)
    phase.value = phases[Math.min(phases.length - 1, Math.floor((p / 100) * phases.length))]
  }, 220)
})
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="splash">
      <div class="grid-bg" />
      <div class="content">
        <div class="emblem">
          <svg viewBox="0 0 120 120" class="emblem-svg">
            <circle cx="60" cy="60" r="54" class="ring-outer" />
            <circle cx="60" cy="60" r="44" class="ring-inner" />
            <path d="M30,72 Q45,56 60,72 T90,72" class="wave w1" />
            <path d="M30,82 Q45,66 60,82 T90,82" class="wave w2" />
            <circle cx="60" cy="44" r="9" class="core" />
            <g class="turbine">
              <line x1="60" y1="44" x2="60" y2="30" />
              <line x1="60" y1="44" x2="72" y2="51" />
              <line x1="60" y1="44" x2="48" y2="51" />
            </g>
          </svg>
        </div>

        <h1 class="title">{{ PLANT_INFO.name }}</h1>
        <p class="subtitle">数字孪生运行监控系统 · Digital Twin</p>
        <p class="spec">
          {{ PLANT_INFO.totalCapacityMW }} MW ·
          {{ PLANT_INFO.unitCount }}×{{ PLANT_INFO.unitCapacityMW }} MW 可逆机组 ·
          {{ PLANT_INFO.location }}
        </p>

        <div class="loader">
          <div class="bar"><div class="bar-fill" :style="{ width: progress + '%' }" /></div>
          <div class="loader-meta">
            <span class="phase">{{ phase }}</span>
            <span class="pct">{{ progress }}%</span>
          </div>
        </div>
      </div>
      <div class="footer-note">
        仿真演示系统 · 实时数据为模拟生成 · 工程参数为公开资料结合合理估算
      </div>
    </div>
  </transition>
</template>


<style scoped>
.splash {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background:
    radial-gradient(ellipse at 50% 35%, rgba(0, 80, 160, 0.25), transparent 60%),
    radial-gradient(ellipse at 50% 100%, rgba(0, 255, 136, 0.1), transparent 50%),
    #04101f;
  overflow: hidden;
}
.grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.06) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  animation: drift 18s linear infinite;
}
@keyframes drift {
  from { background-position: 0 0, 0 0; }
  to { background-position: 44px 44px, 44px 44px; }
}
.content { position: relative; text-align: center; z-index: 1; }

.emblem-svg { width: 120px; height: 120px; }
.ring-outer, .ring-inner { fill: none; stroke: #00d4ff; }
.ring-outer {
  stroke-width: 1.5; opacity: 0.5;
  stroke-dasharray: 30 14;
  transform-origin: 60px 60px;
  animation: spin 8s linear infinite;
}
.ring-inner { stroke-width: 1; opacity: 0.3; }
@keyframes spin { to { transform: rotate(360deg); } }
.wave { fill: none; stroke: #00d4ff; stroke-width: 2.5; stroke-linecap: round; }
.w1 { animation: wave 2.6s ease-in-out infinite; }
.w2 { opacity: 0.5; animation: wave 3.4s ease-in-out infinite; }
@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.core { fill: #00ff88; filter: drop-shadow(0 0 8px #00ff88); }
.turbine line { stroke: #04101f; stroke-width: 2; transform-origin: 60px 44px; animation: spin 1.5s linear infinite; }

.title {
  margin-top: 18px; font-size: 30px; font-weight: 800; letter-spacing: 3px;
  background: linear-gradient(90deg, #fff, #00d4ff 60%, #00ff88);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { margin-top: 6px; font-size: 14px; color: #8fa6c4; letter-spacing: 2px; }
.spec { margin-top: 10px; font-size: 12px; color: #5a6e8a; letter-spacing: 1px; }

.loader { margin-top: 36px; width: 360px; }
.bar {
  height: 4px; background: rgba(255, 255, 255, 0.08);
  border-radius: 2px; overflow: hidden;
}
.bar-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.7);
  transition: width 0.25s ease;
}
.loader-meta {
  display: flex; justify-content: space-between; margin-top: 10px;
  font-size: 12px; color: #8fa6c4; font-variant-numeric: tabular-nums;
}
.phase::before { content: '▸ '; color: #00ff88; }

.footer-note {
  position: absolute; bottom: 22px; font-size: 11px; color: #3a4a60; letter-spacing: 1px;
}

.fade-leave-active { transition: opacity 0.6s ease; }
.fade-leave-to { opacity: 0; }
</style>
