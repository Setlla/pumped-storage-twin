<script setup lang="ts">
import { computed } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { TOTAL_MONTHS, monthLabel } from '@/data/construction'

const c = useConstructionStore()

// 年份刻度
const ticks = computed(() => {
  const out: { left: number; label: string }[] = []
  for (let m = 0; m <= TOTAL_MONTHS; m += 12) {
    out.push({ left: (m / TOTAL_MONTHS) * 100, label: monthLabel(m).split('.')[0] })
  }
  return out
})

function onSeek(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  c.setTime(v / 1000)
}
</script>

<template>
  <div class="timeline">
    <button class="play" @click="c.togglePlay()">{{ c.playing ? '⏸' : '▶' }}</button>
    <div class="tl-main">
      <div class="tl-head">
        <span class="tl-month">{{ c.monthText }}</span>
        <span class="tl-sub">第 {{ Math.round(c.currentMonth) }} 月 / 共 {{ TOTAL_MONTHS }} 月 · 总体进度 {{ c.overallProgress.toFixed(1) }}%</span>
      </div>
      <div class="tl-track">
        <input
          type="range" min="0" max="1000" :value="c.timeT * 1000"
          @input="onSeek" class="tl-range"
        />
        <div class="tl-ticks">
          <span v-for="t in ticks" :key="t.label" class="tick" :style="{ left: t.left + '%' }">{{ t.label }}</span>
        </div>
      </div>
    </div>
    <div class="tl-speed">
      <span>倍速</span>
      <button v-for="s in [1, 3, 6]" :key="s" :class="{ on: c.playSpeed === s }" @click="c.playSpeed = s">{{ s }}x</button>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 18px; height: 64px; flex-shrink: 0;
  border-top: 1px solid var(--border-line); background: rgba(8, 18, 32, 0.85);
}
.play {
  width: 38px; height: 38px; flex-shrink: 0; cursor: pointer;
  border-radius: 50%; border: 1px solid var(--border-line-strong);
  background: linear-gradient(135deg, var(--accent-cyan), #0099ff);
  color: #061222; font-size: 15px;
}
.tl-main { flex: 1; }
.tl-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; }
.tl-month { font-size: 17px; font-weight: 700; color: var(--accent-cyan); font-variant-numeric: tabular-nums; }
.tl-sub { font-size: 11px; color: var(--text-secondary); }
.tl-track { position: relative; }
.tl-range { width: 100%; accent-color: var(--accent-cyan); cursor: pointer; }
.tl-ticks { position: relative; height: 12px; }
.tick { position: absolute; transform: translateX(-50%); font-size: 10px; color: var(--text-dim); }
.tl-speed { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-secondary); }
.tl-speed button {
  padding: 3px 7px; border: 1px solid var(--border-line); border-radius: 3px;
  background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 11px;
}
.tl-speed button.on { background: var(--accent-cyan); color: #061222; border-color: var(--accent-cyan); }
</style>
