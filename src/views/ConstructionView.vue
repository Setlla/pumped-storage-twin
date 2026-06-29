<script setup lang="ts">
import { ref, shallowRef, markRaw } from 'vue'
import ConstructionGlobe from '@/components/construction/ConstructionGlobe.vue'
import SpaceTimeChart from '@/components/construction/SpaceTimeChart.vue'
import EarthworkFlow from '@/components/construction/EarthworkFlow.vue'
import AllocationPanel from '@/components/construction/AllocationPanel.vue'
import DeviationPanel from '@/components/construction/DeviationPanel.vue'
import AlertCenter from '@/components/construction/AlertCenter.vue'
import ForecastPanel from '@/components/construction/ForecastPanel.vue'
import TransportPanel from '@/components/construction/TransportPanel.vue'
import MasterDataPanel from '@/components/construction/MasterDataPanel.vue'
import GovernancePanel from '@/components/construction/GovernancePanel.vue'
import TimelineBar from '@/components/construction/TimelineBar.vue'
import EarthworkBalancePanel from '@/components/construction/EarthworkBalancePanel.vue'
import ProgressPanel from '@/components/construction/ProgressPanel.vue'
import FleetPanel from '@/components/construction/FleetPanel.vue'
import DataImportBar from '@/components/construction/DataImportBar.vue'
import ReportBar from '@/components/construction/ReportBar.vue'
import BackendBar from '@/components/construction/BackendBar.vue'

type Key = 'globe' | 'spacetime' | 'flow' | 'alloc' | 'forecast' | 'transport' | 'dev' | 'alert' | 'master' | 'gov'
const tabs: { key: Key; label: string; icon: string }[] = [
  { key: 'globe', label: '实景地形', icon: '🛰️' },
  { key: 'spacetime', label: '时空平衡', icon: '📈' },
  { key: 'flow', label: '调配流向', icon: '🔀' },
  { key: 'alloc', label: '智能调配', icon: '🧮' },
  { key: 'forecast', label: '进度预判', icon: '🔮' },
  { key: 'transport', label: '运输监管', icon: '🚛' },
  { key: 'dev', label: '设计vs实测', icon: '📐' },
  { key: 'alert', label: '预警中心', icon: '🚨' },
  { key: 'master', label: '基础资料', icon: '🗂️' },
  { key: 'gov', label: '数据治理', icon: '🛡️' }
]
const active = ref<Key>('globe')
function switchTo(k: Key) {
  active.value = k
}
const comps = shallowRef({
  globe: markRaw(ConstructionGlobe),
  spacetime: markRaw(SpaceTimeChart),
  flow: markRaw(EarthworkFlow),
  alloc: markRaw(AllocationPanel),
  forecast: markRaw(ForecastPanel),
  transport: markRaw(TransportPanel),
  dev: markRaw(DeviationPanel),
  alert: markRaw(AlertCenter),
  master: markRaw(MasterDataPanel),
  gov: markRaw(GovernancePanel)
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
      <BackendBar />
      <DataImportBar />
      <ReportBar />
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
  flex: 1; position: relative;
  border: 1px solid var(--border-line); border-radius: 6px;
  overflow: hidden; box-shadow: var(--shadow-glow);
}
.side-rail { width: 360px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.tab-bar {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  z-index: 10; display: flex; gap: 2px;
  background: rgba(8, 18, 32, 0.78); border: 1px solid var(--border-line);
  border-radius: 6px; padding: 3px; backdrop-filter: blur(8px);
}
.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px; border: none; background: transparent;
  color: var(--text-secondary); font-size: 13px; cursor: pointer;
  border-radius: 4px; transition: all 0.2s; letter-spacing: 1px;
}
.tab:hover { color: var(--text-primary); background: rgba(0, 212, 255, 0.08); }
.tab.active {
  color: #061222; font-weight: 600;
  background: linear-gradient(135deg, var(--accent-cyan), #0099ff);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.5);
}
.view-stack { flex: 1; position: relative; height: 100%; }
.view-pane { position: absolute; inset: 0; }
.timeline-wrap { flex-shrink: 0; }
</style>
