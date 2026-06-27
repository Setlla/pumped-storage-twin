<script setup lang="ts">
import TopBar from '@/components/layout/TopBar.vue'
import BottomBar from '@/components/layout/BottomBar.vue'
import ConstructionView from './ConstructionView.vue'
import OperationView from './OperationView.vue'
import { useConstructionStore } from '@/stores/construction'

const c = useConstructionStore()
</script>

<template>
  <div class="dashboard">
    <TopBar />
    <dv-decoration-2 style="width:100%;height:4px;" />

    <div class="phase-switch">
      <button
        class="ps-btn"
        :class="{ active: c.phase === 'construction' }"
        @click="c.setPhase('construction')"
      >
        🏗️ 建设期 · 土石方平衡
      </button>
      <button
        class="ps-btn"
        :class="{ active: c.phase === 'operation' }"
        @click="c.setPhase('operation')"
      >
        ⚡ 运行期 · 削峰填谷
      </button>
      <span class="ps-note">
        本工程计划 2030 年投运，当前处于建设阶段
      </span>
    </div>

    <ConstructionView v-if="c.phase === 'construction'" />
    <OperationView v-else />

    <BottomBar v-if="c.phase === 'operation'" />
  </div>
</template>

<style scoped>
.dashboard {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 30% 0%, rgba(0, 212, 255, 0.08), transparent 60%),
    var(--bg-deep);
}
.phase-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 0;
  flex-shrink: 0;
}
.ps-btn {
  padding: 7px 18px;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  color: var(--text-secondary);
  background: rgba(8, 18, 32, 0.6);
  border: 1px solid var(--border-line);
  border-radius: 5px;
  transition: all 0.2s;
}
.ps-btn:hover { color: var(--text-primary); border-color: var(--border-line-strong); }
.ps-btn.active {
  color: #061222;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent-cyan), #0099ff);
  box-shadow: 0 0 14px rgba(0, 212, 255, 0.5);
}
.ps-note { margin-left: auto; font-size: 12px; color: var(--text-dim); }
</style>
