<script setup lang="ts">
import { ref, shallowRef, markRaw } from 'vue'
import CesiumScene from './CesiumScene.vue'
import PowerhouseScene from './PowerhouseScene.vue'
import SystemSchematic from './SystemSchematic.vue'

type ViewKey = 'panorama' | 'powerhouse' | 'schematic'

const tabs: { key: ViewKey; label: string; icon: string }[] = [
  { key: 'panorama', label: '全景三维', icon: '🌐' },
  { key: 'powerhouse', label: '厂房剖切', icon: '⚙️' },
  { key: 'schematic', label: '系统总览', icon: '📊' }
]

const active = ref<ViewKey>('schematic')

// 已挂载过的视图保持存活(keep-alive 思路用 v-show)
const mounted = ref<Record<ViewKey, boolean>>({
  panorama: false,
  powerhouse: false,
  schematic: true
})

function switchTo(key: ViewKey) {
  active.value = key
  mounted.value[key] = true
}

const comps = shallowRef({
  panorama: markRaw(CesiumScene),
  powerhouse: markRaw(PowerhouseScene),
  schematic: markRaw(SystemSchematic)
})
</script>


<template>
  <div class="tabs-root">
    <div class="tab-bar">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: active === t.key }"
        @click="switchTo(t.key)"
      >
        <span class="tab-icon">{{ t.icon }}</span>{{ t.label }}
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
</template>

<style scoped>
.tabs-root { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
.tab-bar {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  z-index: 10; display: flex; gap: 2px;
  background: rgba(8, 18, 32, 0.78);
  border: 1px solid var(--border-line);
  border-radius: 6px; padding: 3px;
  backdrop-filter: blur(8px);
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
.tab-icon { font-size: 14px; }
.view-stack { flex: 1; position: relative; min-height: 0; }
.view-pane { position: absolute; inset: 0; }
</style>
