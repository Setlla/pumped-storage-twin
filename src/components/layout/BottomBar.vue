<script setup lang="ts">
import { usePlantStore } from '@/stores/plant'
import { ElButton, ElButtonGroup, ElSlider, ElSwitch } from 'element-plus'

const plant = usePlantStore()
</script>

<template>
  <footer class="bottombar">
    <div class="bb-section">
      <span class="bb-label">工况控制</span>
      <ElButtonGroup>
        <ElButton
          :type="plant.globalMode === 'idle' ? 'info' : 'default'"
          size="small"
          @click="plant.setGlobalMode('idle')"
        >
          停机
        </ElButton>
        <ElButton
          :type="plant.globalMode === 'pumping' ? 'warning' : 'default'"
          size="small"
          @click="plant.setGlobalMode('pumping')"
        >
          抽水
        </ElButton>
        <ElButton
          :type="plant.globalMode === 'generating' ? 'success' : 'default'"
          size="small"
          @click="plant.setGlobalMode('generating')"
        >
          发电
        </ElButton>
      </ElButtonGroup>
    </div>

    <div class="bb-section">
      <span class="bb-label">仿真</span>
      <ElSwitch v-model="plant.simRunning" inline-prompt active-text="运行" inactive-text="暂停" />
      <span class="bb-label" style="margin-left: 16px">速度</span>
      <div class="slider-wrap">
        <ElSlider
          v-model="plant.simSpeed"
          :min="0.5"
          :max="10"
          :step="0.5"
          :marks="{ 1: '1x', 5: '5x', 10: '10x' }"
        />
      </div>
    </div>

    <div class="bb-section bb-tip">
      点击场景标记 / 机组卡片可查看详情 · 仿真数据,演示用途
    </div>
  </footer>
</template>

<style scoped>
.bottombar {
  display: flex; align-items: center; gap: 24px;
  padding: 8px 18px; height: 56px; flex-shrink: 0;
  border-top: 1px solid var(--border-line);
  background: rgba(8, 18, 32, 0.85);
}
.bb-section { display: flex; align-items: center; gap: 10px; }
.bb-label { font-size: 12px; color: var(--text-secondary); letter-spacing: 1px; }
.slider-wrap { width: 220px; }
.bb-tip { margin-left: auto; font-size: 11px; color: var(--text-dim); }
</style>
