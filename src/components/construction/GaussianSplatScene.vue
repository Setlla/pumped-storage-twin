<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { SPLAT_PERIODS, type SplatPeriod } from '@/config/splats'

const container = ref<HTMLDivElement | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const errMsg = ref('')
const progress = ref(0)
const activeId = ref(SPLAT_PERIODS[0].id)

let viewer: any = null
let disposed = false

async function loadPeriod(p: SplatPeriod) {
  if (!container.value) return
  activeId.value = p.id
  await destroyViewer()
  if (disposed) return
  status.value = 'loading'
  progress.value = 0
  errMsg.value = ''

  try {
    viewer = new GaussianSplats3D.Viewer({
      rootElement: container.value,
      sharedMemoryForWorkers: false, // 免去 COOP/COEP 跨域隔离要求
      useBuiltInControls: true,
      dynamicScene: false,
      cameraUp: [0, -1, 0],
      initialCameraPosition: [0, 0, 5],
      initialCameraLookAt: [0, 0, 0]
    })
    await viewer.addSplatScene(p.url, {
      splatAlphaRemovalThreshold: 5,
      showLoadingUI: false,
      progressiveLoad: true,
      onProgress: (pct: number) => { progress.value = Math.round(pct) }
    })
    if (disposed) { await destroyViewer(); return }
    viewer.start()
    status.value = 'ready'
  } catch (e: any) {
    errMsg.value = e?.message || String(e)
    status.value = 'error'
  }
}

async function destroyViewer() {
  if (!viewer) return
  try {
    if (viewer.isLoadingOrUnloading && viewer.isLoadingOrUnloading()) {
      // 等待加载结束再销毁
    }
    viewer.stop?.()
    await viewer.dispose?.()
  } catch (e) { /* ignore */ }
  viewer = null
}

onMounted(() => loadPeriod(SPLAT_PERIODS[0]))
onBeforeUnmount(async () => {
  disposed = true
  await destroyViewer()
})
</script>

<template>
  <div class="splat-wrap">
    <div ref="container" class="splat-canvas" />

    <!-- 期次切换(多期实景时间轴) -->
    <div class="splat-periods">
      <span class="sp-title">实景期次</span>
      <button
        v-for="p in SPLAT_PERIODS" :key="p.id"
        class="sp-btn" :class="{ on: activeId === p.id }"
        @click="loadPeriod(p)"
      >{{ p.label }}</button>
    </div>

    <!-- 状态层 -->
    <div v-if="status === 'loading'" class="splat-overlay">
      <div class="spinner" />
      <div class="ov-text">正在加载高斯泼溅实景… {{ progress }}%</div>
      <div class="ov-sub">首次加载示例数据约数十 MB,请稍候</div>
    </div>
    <div v-else-if="status === 'error'" class="splat-overlay">
      <div class="ov-text err">实景加载失败</div>
      <div class="ov-sub">{{ errMsg }}</div>
      <div class="ov-sub">（示例数据来自公开 CDN,可能受网络影响;正式数据将用项目无人机成果）</div>
    </div>

    <div class="splat-note">
      🎞️ 3D 高斯泼溅(3DGS)照片级实景 · 当前为<b>公开示例数据</b><br />
      正式接入项目无人机逐期航飞 .splat 后,即为真实工地多期实景
    </div>
  </div>
</template>

<style scoped>
.splat-wrap { position: relative; width: 100%; height: 100%; background: #05080f; overflow: hidden; }
.splat-canvas { width: 100%; height: 100%; }
.splat-canvas :deep(canvas) { display: block; width: 100% !important; height: 100% !important; }

.splat-periods {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  z-index: 10; display: flex; align-items: center; gap: 6px;
  background: rgba(8, 18, 32, 0.8); border: 1px solid var(--border-line);
  border-radius: 6px; padding: 4px 8px; backdrop-filter: blur(8px);
}
.sp-title { font-size: 12px; color: var(--text-secondary); margin-right: 4px; }
.sp-btn {
  padding: 5px 12px; border: 1px solid var(--border-line); border-radius: 4px;
  background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 12px;
}
.sp-btn.on {
  color: #061222; font-weight: 600; border-color: var(--accent-cyan);
  background: linear-gradient(135deg, var(--accent-cyan), #0099ff);
}
.splat-overlay {
  position: absolute; inset: 0; z-index: 8;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  background: rgba(5, 8, 15, 0.7);
}
.ov-text { font-size: 16px; color: var(--text-primary); letter-spacing: 1px; }
.ov-text.err { color: var(--accent-red); }
.ov-sub { font-size: 12px; color: var(--text-secondary); max-width: 520px; text-align: center; }
.spinner {
  width: 38px; height: 38px; border-radius: 50%;
  border: 3px solid rgba(0, 212, 255, 0.2); border-top-color: var(--accent-cyan);
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.splat-note {
  position: absolute; left: 12px; bottom: 12px; z-index: 6;
  font-size: 11px; line-height: 1.5; color: var(--text-secondary);
  background: rgba(8, 18, 32, 0.72); border: 1px solid var(--border-line);
  padding: 6px 10px; border-radius: 4px; pointer-events: none;
}
.splat-note b { color: var(--accent-orange); }
</style>
