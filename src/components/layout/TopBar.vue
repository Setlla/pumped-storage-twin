<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { usePlantStore } from '@/stores/plant'
import { PLANT_INFO } from '@/data/plantConfig'
import { tierLabel, tierColor } from '@/data/dispatch'
import { useConstructionStore } from '@/stores/construction'
import CountTo from '@/components/common/CountTo.vue'

const plant = usePlantStore()
const c = useConstructionStore()
const now = ref(new Date())
let timer = 0
onMounted(() => {
  timer = window.setInterval(() => (now.value = new Date()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const clock = computed(() => {
  const d = now.value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const modeLabel = computed(() => {
  const m = plant.globalMode
  return m === 'idle' ? '停机备用' : m === 'pumping' ? '抽水工况' : '发电工况'
})
const modeClass = computed(() => `mode-${plant.globalMode}`)

const activeAlarms = computed(() =>
  plant.alarms.filter((a) => a.level !== 'info').length
)

const simClock = computed(() => {
  const h = Math.floor(plant.simHour)
  const m = Math.floor((plant.simHour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})
const isDay = computed(() => plant.currentHour >= 6 && plant.currentHour < 18)
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <div class="logo" />
      <div class="brand-text">
        <div class="brand-title">{{ PLANT_INFO.name }} · 数字孪生</div>
        <div class="brand-sub">
          {{ PLANT_INFO.totalCapacityMW }}MW · {{ PLANT_INFO.unitCount }}×{{ PLANT_INFO.unitCapacityMW }}MW
          · {{ PLANT_INFO.location }}
        </div>
      </div>
    </div>

    <div class="kpi-row" v-if="c.phase === 'operation'">
      <div class="kpi">
        <div class="kpi-label">当前工况</div>
        <div class="kpi-value" :class="modeClass">{{ modeLabel }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">总出力</div>
        <div class="kpi-value">
          <CountTo :value="plant.totalPowerMW" :decimals="0" />
          <span class="kpi-unit">MW</span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">运行机组</div>
        <div class="kpi-value">{{ plant.runningUnitCount }} / {{ PLANT_INFO.unitCount }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">毛水头</div>
        <div class="kpi-value">
          {{ plant.netHeadM.toFixed(1) }}
          <span class="kpi-unit">m</span>
        </div>
      </div>
      <div class="kpi alarm" :class="{ active: activeAlarms > 0 }">
        <div class="kpi-label">活动告警</div>
        <div class="kpi-value">{{ activeAlarms }}</div>
      </div>
    </div>

    <div class="kpi-row" v-else>
      <div class="kpi">
        <div class="kpi-label">总体进度</div>
        <div class="kpi-value" style="color: var(--accent-cyan)">
          <CountTo :value="c.overallProgress" :decimals="1" /><span class="kpi-unit">%</span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">挖填平衡率</div>
        <div class="kpi-value" style="color: var(--accent-green)">
          <CountTo :value="c.balanceRate" :decimals="0" /><span class="kpi-unit">%</span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">开挖 / 填筑</div>
        <div class="kpi-value">{{ c.cutPlan.toFixed(0) }} / {{ c.fillPlan.toFixed(0) }}<span class="kpi-unit">万m³</span></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">今日车次</div>
        <div class="kpi-value"><CountTo :value="c.tripsToday" :decimals="0" /></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">边坡位移</div>
        <div class="kpi-value">{{ c.slopeDisp.toFixed(1) }}<span class="kpi-unit">mm</span></div>
      </div>
    </div>

    <div class="clock-group">
      <div class="sim-clock" v-if="c.phase === 'operation'">
        <span class="day-icon">{{ isDay ? '☀️' : '🌙' }}</span>
        <span class="sim-time">{{ simClock }}</span>
        <span class="tier-badge" :style="{ color: tierColor(plant.currentTier), borderColor: tierColor(plant.currentTier) }">
          {{ tierLabel(plant.currentTier) }}
        </span>
      </div>
      <div class="sim-clock" v-else>
        <span class="day-icon">🏗️</span>
        <span class="sim-time" style="font-size: 15px">建设期</span>
        <span class="tier-badge" style="color: var(--accent-cyan); border-color: var(--accent-cyan)">
          目标 2030 投运
        </span>
      </div>
      <div class="clock">{{ clock }}</div>
    </div>
  </header>
</template>


<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-line);
  background:
    linear-gradient(180deg, rgba(0, 212, 255, 0.08), transparent 80%),
    rgba(8, 18, 32, 0.85);
  height: 64px;
  flex-shrink: 0;
}
.brand { display: flex; align-items: center; gap: 12px; }
.logo {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background:
    radial-gradient(circle at 30% 30%, rgba(0, 255, 136, 0.7), transparent 50%),
    linear-gradient(135deg, var(--accent-cyan), #0066ff);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
}
.brand-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #fff, #00d4ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-sub { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

.kpi-row { display: flex; gap: 28px; }
.kpi {
  display: flex; flex-direction: column; align-items: flex-start;
  border-left: 2px solid var(--border-line);
  padding-left: 12px;
}
.kpi-label { font-size: 10px; color: var(--text-secondary); letter-spacing: 1px; }
.kpi-value {
  font-size: 18px; font-weight: 700; color: var(--text-primary);
  font-variant-numeric: tabular-nums; line-height: 1.3;
}
.kpi-unit { font-size: 11px; color: var(--text-dim); font-weight: 400; margin-left: 2px; }

.mode-idle { color: var(--text-secondary); }
.mode-pumping { color: var(--accent-orange); text-shadow: 0 0 12px rgba(255, 157, 0, 0.55); }
.mode-generating { color: var(--accent-green); text-shadow: 0 0 12px rgba(0, 255, 136, 0.55); }

.kpi.alarm.active .kpi-value {
  color: var(--accent-red);
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { text-shadow: 0 0 8px rgba(255, 56, 96, 0.4); }
  50% { text-shadow: 0 0 16px rgba(255, 56, 96, 0.9); }
}

.clock {
  font-size: 13px; color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}
.clock-group { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.sim-clock { display: flex; align-items: center; gap: 8px; }
.day-icon { font-size: 15px; }
.sim-time {
  font-size: 20px; font-weight: 700; color: var(--accent-cyan);
  font-variant-numeric: tabular-nums; letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
}
.tier-badge {
  font-size: 11px; font-weight: 600; padding: 1px 7px;
  border: 1px solid; border-radius: 3px; letter-spacing: 1px;
}
</style>
