<script setup lang="ts">
import { ref } from 'vue'

// UE5 像素流地址:通过环境变量 VITE_UE5_STREAM_URL 注入(UE 工程打包 + GPU 服务器 + 像素流信令)
const url = ref<string>((import.meta.env.VITE_UE5_STREAM_URL as string) || '')
const manualUrl = ref('')
function connect() { if (manualUrl.value.trim()) url.value = manualUrl.value.trim() }
</script>

<template>
  <div class="ue5-wrap">
    <iframe v-if="url" :src="url" class="ue5-frame" allow="autoplay; fullscreen; gamepad" />
    <div v-else class="ue5-placeholder">
      <div class="ue-icon">🎬</div>
      <div class="ue-title">UE5 汇报级三维大屏(像素流接入位)</div>
      <p class="ue-desc">
        本视图用于嵌入 <b>Unreal Engine 5 像素流(Pixel Streaming)</b> 的影视级三维场景。<br />
        前端接入位已就绪,投产需具备:① UE5 工程打包 ② 带 GPU 的像素流服务器 ③ 信令/转发服务。
      </p>
      <div class="ue-form">
        <input v-model="manualUrl" placeholder="粘贴像素流播放页地址 https://..." />
        <button @click="connect">接入</button>
      </div>
      <p class="ue-tip">或配置环境变量 VITE_UE5_STREAM_URL 自动接入。当前 Web 三维(Cesium/Three)已覆盖日常业务,UE5 建议用于重点汇报场景。</p>
    </div>
  </div>
</template>

<style scoped>
.ue5-wrap { width: 100%; height: 100%; position: relative; background: #05080f; }
.ue5-frame { width: 100%; height: 100%; border: none; }
.ue5-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; padding: 24px; }
.ue-icon { font-size: 52px; opacity: 0.7; }
.ue-title { font-size: 18px; font-weight: 700; color: var(--text-primary); letter-spacing: 1px; }
.ue-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.8; max-width: 560px; }
.ue-desc b { color: var(--accent-cyan); }
.ue-form { display: flex; gap: 8px; margin-top: 4px; }
.ue-form input { width: 360px; background: rgba(0,30,60,0.4); border: 1px solid var(--border-line); border-radius: 5px; color: var(--text-primary); padding: 8px 12px; font-size: 13px; }
.ue-form button { padding: 8px 18px; border: 1px solid var(--accent-cyan); border-radius: 5px; background: linear-gradient(135deg, var(--accent-cyan), #0099ff); color: #061222; font-weight: 600; cursor: pointer; }
.ue-tip { font-size: 11px; color: var(--text-dim); max-width: 560px; line-height: 1.6; }
</style>
