<script setup lang="ts">
import { ref, shallowRef, markRaw } from 'vue'
import ValueCockpit from '@/components/construction/ValueCockpit.vue'
import ConstructionGlobe from '@/components/construction/ConstructionGlobe.vue'
import SpaceTimeChart from '@/components/construction/SpaceTimeChart.vue'
import TimePlanPanel from '@/components/construction/TimePlanPanel.vue'
import EarthworkFlow from '@/components/construction/EarthworkFlow.vue'
import DeviationPanel from '@/components/construction/DeviationPanel.vue'
import ForecastPanel from '@/components/construction/ForecastPanel.vue'
import AiAssistant from '@/components/construction/AiAssistant.vue'
import TimelineBar from '@/components/construction/TimelineBar.vue'
import EarthworkBalancePanel from '@/components/construction/EarthworkBalancePanel.vue'
import ProgressPanel from '@/components/construction/ProgressPanel.vue'
import FleetPanel from '@/components/construction/FleetPanel.vue'

type Key = 'cockpit' | 'ai' | 'globe' | 'spacetime' | 'timeplan' | 'flow' | 'forecast' | 'dev'
const tabs: { key: Key; label: string; icon: string }[] = [
  { key: 'cockpit', label: '决策驾驶舱', icon: '🎯' },
  { key: 'ai', label: '智能助手', icon: '🤖' },
  { key: 'globe', label: '实景地形', icon: '🛰️' },
  { key: 'spacetime', label: '时空平衡', icon: '📈' },
  { key: 'timeplan', label: '调配计划', icon: '🗓️' },
  { key: 'flow', label: '调配流向', icon: '🔀' },
  { key: 'forecast', label: '进度预判', icon: '🔮' },
  { key: 'dev', label: '设计vs实测', icon: '📐' }
]
const active = ref<Key>('cockpit')
function switchTo(k: Key) {
  active.value = k
}
const comps = shallowRef({
  cockpit: markRaw(ValueCockpit),
  ai: markRaw(AiAssistant),
  globe: markRaw(ConstructionGlobe),
  spacetime: markRaw(SpaceTimeChart),
  timeplan: markRaw(TimePlanPanel),
  flow: markRaw(EarthworkFlow),
  forecast: markRaw(ForecastPanel),
  dev: markRaw(DeviationPanel)
})
</script>

<template>
  <div class="phase-body">
    <div class="left-col">
      <div class="scene-area">
        <div class="tab-bar">
          <button
            v-for="t in tabs" :key="t.key"
            class="tab" :class="{ active: active === t.key }"
            @click="switchTo(t.key)"
          >
            <span>{{ t.icon }}</span>{{ t.label }}
          </button>
        </div>
        <div class="view-stack">
          <component :is="comps[active]" />
        </div>
      </div>
      <TimelineBar />
    </div>
    <aside class="side-rail">
      <EarthworkBalancePanel />
      <ProgressPanel />
      <FleetPanel />
    </aside>
  </div>
</template>

<style scoped>
.phase-body { flex: 1; display: flex; min-height: 0; padding: 10px; gap: 10px; }
.left-col { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.scene-area {
  flex: 1; display: flex; flex-direction: column; min-height: 0;
  border: 1px solid var(--border-line); border-radius: 6px;
  overflow: hidden; box-shadow: var(--shadow-glow);
}
.side-rail { width: 360px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.tab-bar {
  flex-shrink: 0; z-index: 10; display: flex; gap: 2px;
  background: rgba(8, 18, 32, 0.95);
  border-bottom: 1px solid var(--border-line);
  padding: 4px 6px;
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: thin; scrollbar-color: var(--accent-cyan) transparent;
}
.tab-bar::-webkit-scrollbar { height: 4px; }
.tab-bar::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.4); border-radius: 2px; }
.tab {
  flex: 0 0 auto; white-space: nowrap;
  display: flex; align-items: center; gap: 5px;
  padding: 7px 14px; border: none; background: transparent;
  color: var(--text-secondary); font-size: 13px; cursor: pointer;
  border-radius: 4px; transition: all 0.2s; letter-spacing: 0.5px;
}
.tab:hover { color: var(--text-primary); background: rgba(0, 212, 255, 0.08); }
.tab.active {
  color: #061222; font-weight: 600;
  background: linear-gradient(135deg, var(--accent-cyan), #0099ff);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
}
.view-stack { flex: 1; position: relative; min-height: 0; }
.view-pane { position: absolute; inset: 0; }
.timeline-wrap { flex-shrink: 0; }
</style>
