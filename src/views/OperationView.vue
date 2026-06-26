<script setup lang="ts">
import SceneTabs from '@/components/scene/SceneTabs.vue'
import ReservoirPanel from '@/components/panels/ReservoirPanel.vue'
import UnitStatusPanel from '@/components/panels/UnitStatusPanel.vue'
import EnergyPanel from '@/components/panels/EnergyPanel.vue'
import DispatchPanel from '@/components/panels/DispatchPanel.vue'
import PowerCurveChart from '@/components/panels/PowerCurveChart.vue'
import AlarmFeed from '@/components/panels/AlarmFeed.vue'
</script>

<template>
  <div class="phase-body">
    <div class="scene-area">
      <SceneTabs />
    </div>
    <aside class="side-rail">
      <ReservoirPanel />
      <DispatchPanel />
      <EnergyPanel />
      <UnitStatusPanel />
      <PowerCurveChart />
      <AlarmFeed />
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
</style>
