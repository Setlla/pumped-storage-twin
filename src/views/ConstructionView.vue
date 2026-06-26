<script setup lang="ts">
import { ref, shallowRef, markRaw } from 'vue'
import ConstructionScene from '@/components/construction/ConstructionScene.vue'
import EarthworkFlow from '@/components/construction/EarthworkFlow.vue'
import EarthworkBalancePanel from '@/components/construction/EarthworkBalancePanel.vue'
import ProgressPanel from '@/components/construction/ProgressPanel.vue'
import FleetPanel from '@/components/construction/FleetPanel.vue'

type Key = 'site' | 'flow'
const tabs: { key: Key; label: string; icon: string }[] = [
  { key: 'site', label: '施工三维', icon: '🏗️' },
  { key: 'flow', label: '土石方调配', icon: '🔀' }
]
const active = ref<Key>('site')
const mounted = ref<Record<Key, boolean>>({ site: true, flow: false })
function switchTo(k: Key) {
  active.value = k
  mounted.value[k] = true
}
const comps = shallowRef({
  site: markRaw(ConstructionScene),
  flow: markRaw(EarthworkFlow)
})
</script>

<template>
  <div class="phase-body">
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
    <aside class="side-rail">
      <EarthworkBalancePanel />
      <ProgressPanel />
      <FleetPanel />
    </aside>
  </div>
</template>

<style scoped>
.phase-body { flex: 1; display: flex; min-height: 0; padding: 10px; gap: 10px; }
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
</style>
