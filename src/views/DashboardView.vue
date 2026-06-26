<script setup lang="ts">
import TopBar from '@/components/layout/TopBar.vue'
import BottomBar from '@/components/layout/BottomBar.vue'
import SceneTabs from '@/components/scene/SceneTabs.vue'
import ReservoirPanel from '@/components/panels/ReservoirPanel.vue'
import UnitStatusPanel from '@/components/panels/UnitStatusPanel.vue'
import EnergyPanel from '@/components/panels/EnergyPanel.vue'
import PowerCurveChart from '@/components/panels/PowerCurveChart.vue'
import AlarmFeed from '@/components/panels/AlarmFeed.vue'
</script>

<template>
  <div class="dashboard">
    <TopBar />
    <div class="dashboard-body">
      <div class="scene-area">
        <SceneTabs />
      </div>
      <aside class="side-rail">
        <ReservoirPanel />
        <EnergyPanel />
        <UnitStatusPanel />
        <PowerCurveChart />
        <AlarmFeed />
      </aside>
    </div>
    <BottomBar />
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
.dashboard-body {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 10px;
  gap: 10px;
}
.scene-area {
  flex: 1;
  position: relative;
  border: 1px solid var(--border-line);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: var(--shadow-glow);
}
.side-rail {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
</style>
