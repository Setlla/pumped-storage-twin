<script setup lang="ts">
import { ref, shallowRef, markRaw } from 'vue'
import ConstructionGlobe from '@/components/construction/ConstructionGlobe.vue'
import GaussianSplatScene from '@/components/construction/GaussianSplatScene.vue'
import ConstructionScene from '@/components/construction/ConstructionScene.vue'
import SpaceTimeChart from '@/components/construction/SpaceTimeChart.vue'
import EarthworkFlow from '@/components/construction/EarthworkFlow.vue'
import AllocationPanel from '@/components/construction/AllocationPanel.vue'
import TimelineBar from '@/components/construction/TimelineBar.vue'
import EarthworkBalancePanel from '@/components/construction/EarthworkBalancePanel.vue'
import ProgressPanel from '@/components/construction/ProgressPanel.vue'
import FleetPanel from '@/components/construction/FleetPanel.vue'

type Key = 'globe' | 'splat' | 'site' | 'spacetime' | 'flow' | 'alloc'
const tabs: { key: Key; label: string; icon: string }[] = [
  { key: 'globe', label: '实景地形', icon: '🛰️' },
  { key: 'splat', label: '高斯泼溅(示例)', icon: '🎞️' },
  { key: 'site', label: '4D 施工示意', icon: '🏔️' },
  { key: 'spacetime', label: '时空平衡', icon: '📈' },
  { key: 'flow', label: '调配流向', icon: '🔀' },
  { key: 'alloc', label: '智能调配', icon: '🧮' }
]
const active = ref<Key>('globe')
const mounted = ref<Record<Key, boolean>>({ globe: true, splat: false, site: false, spacetime: false, flow: false, alloc: false })
function switchTo(k: Key) {
  active.value = k
  mounted.value[k] = true
}
const comps = shallowRef({
  globe: markRaw(ConstructionGlobe),
  splat: markRaw(GaussianSplatScene),
  site: markRaw(ConstructionScene),
  spacetime: markRaw(SpaceTimeChart),
  flow: markRaw(EarthworkFlow),
  alloc: markRaw(AllocationPanel)
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
          <template v-for="t in tabs" :key="t.key">
            <div v-show="active === t.key" class="view-pane">
              <component :is="comps[t.key]" v-if="mounted[t.key]" />
            </div>
          </template>
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
