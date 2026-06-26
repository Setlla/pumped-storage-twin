<script setup lang="ts">
import { computed } from 'vue'
import { usePlantStore } from '@/stores/plant'
import { PLANT_INFO } from '@/data/plantConfig'

const plant = usePlantStore()

// 工况 → 水流方向: generating 上→下(正向), pumping 下→上(反向)
const flowState = computed(() => {
  if (plant.globalMode === 'generating') return 'gen'
  if (plant.globalMode === 'pumping') return 'pump'
  return 'idle'
})

const flowColor = computed(() =>
  flowState.value === 'gen' ? '#00e0ff'
    : flowState.value === 'pump' ? '#ff9d00'
    : '#3a4a60'
)

// 上水库水面 y 坐标 (随水位): 正常 90, 死水 130
const upperWaterY = computed(() => {
  const p = Math.max(0, Math.min(1, plant.upperFillPct / 100))
  return 130 - p * 40
})
const lowerWaterY = computed(() => {
  const p = Math.max(0, Math.min(1, plant.lowerFillPct / 100))
  return 430 - p * 35
})

// 流速 → dash 动画时长
const flowDur = computed(() => {
  if (flowState.value === 'idle') return '0s'
  const ratio = Math.abs(plant.totalPowerMW) / PLANT_INFO.totalCapacityMW
  return `${(2.2 - ratio * 1.6).toFixed(2)}s`
})
const flowReverse = computed(() => (flowState.value === 'pump' ? 'reverse' : 'normal'))
</script>


<template>
  <div class="sch-wrap">
    <svg viewBox="0 0 900 500" preserveAspectRatio="xMidYMid meet" class="sch-svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0a1a30" />
          <stop offset="100%" stop-color="#061222" />
        </linearGradient>
        <linearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#243042" />
          <stop offset="100%" stop-color="#161e2c" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e88ff" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#0a3a7a" stop-opacity="0.95" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="900" height="500" fill="url(#sky)" />

      <!-- 山体地形 -->
      <path
        d="M0,150 L160,90 L300,150 L520,300 L640,360 L900,360 L900,500 L0,500 Z"
        fill="url(#rock)" stroke="#34465e" stroke-width="1.5"
      />

      <!-- 上水库 -->
      <g>
        <path d="M60,90 L260,90 L240,150 L80,150 Z" fill="#0c1c30" stroke="#34465e" stroke-width="1.5" />
        <clipPath id="upperClip"><path d="M60,90 L260,90 L240,150 L80,150 Z" /></clipPath>
        <rect :y="upperWaterY" x="60" width="200" :height="160 - upperWaterY" fill="url(#water)" clip-path="url(#upperClip)" />
        <text x="160" y="78" class="lbl" text-anchor="middle">上水库 · {{ plant.upperReservoir.levelM.toFixed(0) }}m</text>
      </g>

      <!-- 进水口塔架 -->
      <rect x="232" y="120" width="14" height="44" fill="#3a4658" stroke="#5a6e8a" />

      <!-- 调压井 (竖井) -->
      <rect x="392" y="150" width="16" height="120" fill="#1a2434" stroke="#34465e" />
      <text x="400" y="142" class="lbl-sm" text-anchor="middle">调压井</text>

      <!-- 输水道 (引水隧洞 → 厂房 → 尾水隧洞) 底层管路 -->
      <path
        d="M239,140 L400,250 L400,330 L470,360 L560,360 L760,400"
        fill="none" stroke="#2a3a52" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"
      />
      <!-- 水流动画层 -->
      <path
        class="flow"
        d="M239,140 L400,250 L400,330 L470,360 L560,360 L760,400"
        fill="none" :stroke="flowColor" stroke-width="6"
        stroke-linejoin="round" stroke-linecap="round"
        :style="{
          '--flow-dur': flowDur,
          '--flow-dir': flowReverse,
          opacity: flowState === 'idle' ? 0.15 : 0.95
        }"
      />


      <!-- 地下厂房 -->
      <g>
        <rect x="450" y="330" width="130" height="60" rx="4" fill="#0e1c30" stroke="#00d4ff" stroke-width="1.5" />
        <text x="515" y="324" class="lbl" text-anchor="middle">地下厂房</text>
        <g v-for="(u, i) in plant.units" :key="u.id">
          <circle
            :cx="468 + i * 30" cy="360" r="9"
            :fill="u.mode === 'generating' ? '#00ff88' : u.mode === 'pumping' ? '#ff9d00' : u.mode === 'fault' ? '#ff3860' : '#3a4a60'"
            :class="{ spin: u.mode !== 'stopped' && u.mode !== 'fault' }"
            :style="{ transformOrigin: `${468 + i * 30}px 360px` }"
          />
          <text :x="468 + i * 30" y="364" class="unit-num" text-anchor="middle">{{ u.id }}</text>
        </g>
      </g>

      <!-- 下水库 -->
      <g>
        <path d="M620,400 L860,400 L840,455 L640,455 Z" fill="#0c1c30" stroke="#34465e" stroke-width="1.5" />
        <clipPath id="lowerClip"><path d="M620,400 L860,400 L840,455 L640,455 Z" /></clipPath>
        <rect :y="lowerWaterY" x="620" width="240" :height="465 - lowerWaterY" fill="url(#water)" clip-path="url(#lowerClip)" />
        <text x="740" y="392" class="lbl" text-anchor="middle">下水库 · {{ plant.lowerReservoir.levelM.toFixed(0) }}m</text>
      </g>

      <!-- 输电线路到升压站 -->
      <g stroke="#a78bfa" stroke-width="1.2" fill="none" opacity="0.7">
        <path d="M515,330 L515,250 L640,180" />
        <path d="M515,330 L520,250 L645,184" stroke-dasharray="3 3" />
      </g>
      <g>
        <rect x="636" y="150" width="40" height="34" rx="3" fill="#1a1430" stroke="#a78bfa" />
        <text x="656" y="144" class="lbl-sm" text-anchor="middle">升压站</text>
      </g>

      <!-- 水头标注 -->
      <line x1="300" y1="110" x2="300" y2="420" stroke="#00d4ff" stroke-width="0.8" stroke-dasharray="4 4" opacity="0.5" />
      <text x="308" y="270" class="head-lbl">毛水头 {{ plant.netHeadM.toFixed(0) }} m</text>

      <!-- 工况标识 -->
      <text x="30" y="40" class="mode-lbl" :fill="flowColor">
        {{ flowState === 'gen' ? '▼ 发电工况 · 上库放水' : flowState === 'pump' ? '▲ 抽水工况 · 下库提水' : '■ 停机备用' }}
      </text>
      <text x="30" y="62" class="sub-lbl">总出力 {{ plant.totalPowerMW.toFixed(0) }} MW · 运行 {{ plant.runningUnitCount }}/{{ PLANT_INFO.unitCount }}</text>
    </svg>
  </div>
</template>


<style scoped>
.sch-wrap {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.06), transparent 60%),
    #061222;
}
.sch-svg { width: 100%; height: 100%; }

.flow {
  stroke-dasharray: 10 14;
  animation: flowMove var(--flow-dur, 2s) linear infinite;
  animation-direction: var(--flow-dir, normal);
  filter: drop-shadow(0 0 4px currentColor);
  transition: opacity 0.4s;
}
@keyframes flowMove {
  to { stroke-dashoffset: -48; }
}

.spin { animation: spin 1.4s linear infinite; }
@keyframes spin {
  to { transform: rotate(360deg); }
}

.lbl { fill: #e6f1ff; font-size: 13px; font-weight: 600; }
.lbl-sm { fill: #8fa6c4; font-size: 10px; }
.unit-num { fill: #061222; font-size: 10px; font-weight: 700; }
.head-lbl { fill: #00d4ff; font-size: 11px; }
.mode-lbl { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
.sub-lbl { fill: #8fa6c4; font-size: 12px; }
</style>
