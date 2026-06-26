<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as api from '@/services/api'
import { useConstructionStore } from '@/stores/construction'
import { useMasterDataStore } from '@/stores/masterData'
import { ElMessage, ElMessageBox } from 'element-plus'

const c = useConstructionStore()
const m = useMasterDataStore()
const status = ref<'未连接' | '在线' | '已登录'>('未连接')
const role = ref('')

onMounted(async () => {
  try { await api.health(); status.value = api.getToken() ? '已登录' : '在线' } catch { status.value = '未连接' }
})

async function login() {
  try {
    const { value } = await ElMessageBox.prompt('账号 / 密码(演示: admin / admin123)', '登录数据服务', {
      inputPlaceholder: 'admin admin123', confirmButtonText: '登录', cancelButtonText: '取消'
    })
    const [u, p] = (value || '').trim().split(/\s+/)
    const r = await api.login(u, p)
    role.value = r.role; status.value = '已登录'
    ElMessage.success(`已登录(${r.user}/${r.role})`)
  } catch (e: any) { if (e !== 'cancel') ElMessage.error('登录失败: ' + (e?.message || e)) }
}

async function pull() {
  try {
    const [cut, fill, yards, roads, vehicles, equips] = await Promise.all([
      api.getData('cutZones'), api.getData('fillZones'), api.getData('yards'),
      api.getData('roads'), api.getData('vehicles'), api.getData('equips')
    ])
    c.applyImport(cut, fill)
    m.replaceAll({ yards, roads, vehicles, equips })
    ElMessage.success('已从后端加载数据')
  } catch (e: any) { ElMessage.error('加载失败: ' + (e?.message || e)) }
}

async function push() {
  if (!api.getToken()) { ElMessage.warning('请先登录'); return }
  try {
    await Promise.all([
      api.putData('cutZones', c.cutZones), api.putData('fillZones', c.fillZones),
      api.putData('yards', m.yards), api.putData('roads', m.roads),
      api.putData('vehicles', m.vehicles), api.putData('equips', m.equips)
    ])
    ElMessage.success('已保存到后端')
  } catch (e: any) { ElMessage.error('保存失败: ' + (e?.message || e)) }
}
</script>

<template>
  <div class="be-bar">
    <span class="dot" :class="status === '未连接' ? 'off' : 'on'" />
    <span class="st">数据服务：{{ status }}</span>
    <div class="btns">
      <button class="bb" @click="login" v-if="status !== '已登录'">登录</button>
      <button class="bb" @click="pull">拉取</button>
      <button class="bb primary" @click="push">保存到后端</button>
    </div>
  </div>
</template>

<style scoped>
.be-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.on { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
.dot.off { background: var(--text-dim); }
.st { font-size: 12px; color: var(--text-secondary); }
.btns { margin-left: auto; display: flex; gap: 6px; }
.bb { padding: 5px 11px; font-size: 12px; cursor: pointer; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); }
.bb.primary { color: #061222; font-weight: 600; border-color: var(--accent-cyan); background: linear-gradient(135deg, var(--accent-cyan), #0099ff); }
</style>
