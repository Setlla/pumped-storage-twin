<script setup lang="ts">
import BackendBar from '@/components/construction/BackendBar.vue'
</script>

<template>
  <div class="page">
    <BackendBar />
    <div class="hint">
      <b>数据服务(轻量后端)</b><br />
      启动后端:<code>cd server &amp;&amp; npm install &amp;&amp; npm start</code>(默认端口 8787)。<br />
      登录(演示 admin / admin123)后,可将工区台账与基础资料<b>拉取</b>自后端、或<b>保存</b>到后端落库;读公开、写需管理员。<br />
      生产环境可将 JSON 文件存储平滑替换为 PostgreSQL/PostGIS,并接入统一权限与审计。
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.hint { font-size: 13px; color: var(--text-secondary); line-height: 1.9; background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 14px 16px; }
.hint b { color: var(--text-primary); }
.hint code { color: var(--accent-cyan); background: rgba(0,212,255,0.08); padding: 1px 6px; border-radius: 3px; }
</style>
