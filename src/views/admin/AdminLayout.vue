<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menu = [
  { group: '数据管理', items: [
    { path: '/admin/master', label: '基础资料管理', icon: '🗂️' },
    { path: '/admin/import', label: '台账数据导入', icon: '📥' },
    { path: '/admin/backend', label: '数据服务连接', icon: '🔌' }
  ] },
  { group: '业务管理', items: [
    { path: '/admin/allocation', label: '调配方案与参数', icon: '🧮' },
    { path: '/admin/alert', label: '预警阈值与处置', icon: '🚨' },
    { path: '/admin/transport', label: '运输记录管理', icon: '🚛' }
  ] },
  { group: '报表与治理', items: [
    { path: '/admin/report', label: '报表中心', icon: '📄' },
    { path: '/admin/audit', label: '操作审计与治理', icon: '🛡️' }
  ] }
]
const title = computed(() => (route.meta.title as string) || '后台管理')
</script>

<template>
  <div class="admin">
    <aside class="side">
      <div class="brand">
        <div class="logo" />
        <div>
          <div class="bt">土石方平衡 · 后台管理</div>
          <div class="bs">连云港抽水蓄能</div>
        </div>
      </div>
      <nav class="nav">
        <div v-for="g in menu" :key="g.group" class="grp">
          <div class="grp-t">{{ g.group }}</div>
          <router-link
            v-for="it in g.items" :key="it.path" :to="it.path"
            class="item" :class="{ on: route.path === it.path }"
          >
            <span class="ic">{{ it.icon }}</span>{{ it.label }}
          </router-link>
        </div>
      </nav>
      <router-link to="/" class="back">← 返回数字孪生大屏</router-link>
    </aside>

    <main class="main">
      <header class="topbar">
        <span class="crumb">后台管理 / <b>{{ title }}</b></span>
        <router-link to="/" class="to-screen">🖥️ 数字孪生大屏</router-link>
      </header>
      <div class="content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin { width: 100%; height: 100%; display: flex; background: var(--bg-deep); }
.side { width: 230px; flex-shrink: 0; display: flex; flex-direction: column; background: rgba(8,18,32,0.9); border-right: 1px solid var(--border-line); }
.brand { display: flex; align-items: center; gap: 10px; padding: 16px 16px; border-bottom: 1px solid var(--border-line); }
.logo { width: 32px; height: 32px; border-radius: 5px; background: linear-gradient(135deg, var(--accent-cyan), #0066ff); box-shadow: 0 0 12px rgba(0,212,255,0.5); }
.bt { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.bs { font-size: 11px; color: var(--text-secondary); }
.nav { flex: 1; overflow-y: auto; padding: 10px 0; }
.grp { margin-bottom: 10px; }
.grp-t { font-size: 11px; color: var(--text-dim); padding: 6px 18px; letter-spacing: 1px; }
.item { display: flex; align-items: center; gap: 9px; padding: 9px 18px; color: var(--text-secondary); text-decoration: none; font-size: 13px; border-left: 3px solid transparent; }
.item:hover { background: rgba(0,212,255,0.06); color: var(--text-primary); }
.item.on { background: rgba(0,212,255,0.1); color: var(--accent-cyan); border-left-color: var(--accent-cyan); }
.ic { font-size: 14px; }
.back { display: block; padding: 12px 18px; border-top: 1px solid var(--border-line); color: var(--text-secondary); text-decoration: none; font-size: 12px; }
.back:hover { color: var(--accent-cyan); }
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar { height: 52px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--border-line); background: rgba(8,18,32,0.6); }
.crumb { font-size: 13px; color: var(--text-secondary); }
.crumb b { color: var(--text-primary); }
.to-screen { font-size: 13px; color: var(--accent-cyan); text-decoration: none; padding: 5px 12px; border: 1px solid var(--border-line-strong); border-radius: 5px; }
.content { flex: 1; min-height: 0; overflow: auto; }
</style>
