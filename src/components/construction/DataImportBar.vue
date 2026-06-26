<script setup lang="ts">
import { ref } from 'vue'
import { useConstructionStore } from '@/stores/construction'
import { downloadTemplate, parseFile } from '@/logic/importData'
import { ElMessage } from 'element-plus'

const c = useConstructionStore()
const fileInput = ref<HTMLInputElement | null>(null)

function pick() { fileInput.value?.click() }

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  try {
    const res = await parseFile(f)
    if (res.cut.length === 0 && res.fill.length === 0) {
      ElMessage.error('导入失败: ' + (res.errors[0] || '无有效数据'))
    } else {
      c.applyImport(res.cut, res.fill)
      ElMessage.success(`导入成功: 开挖 ${res.cut.length} 项 / 填筑 ${res.fill.length} 项${res.errors.length ? ('，' + res.errors.length + ' 行跳过') : ''}`)
    }
  } catch (err: any) {
    ElMessage.error('解析失败: ' + (err?.message || err))
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="import-bar">
    <span class="src" :class="{ live: c.dataSource === '导入数据' }">
      数据源：{{ c.dataSource }}
    </span>
    <div class="btns">
      <button class="ib" @click="downloadTemplate">下载模板</button>
      <button class="ib primary" @click="pick">导入台账</button>
      <button v-if="c.dataSource === '导入数据'" class="ib" @click="c.resetData()">恢复示例</button>
    </div>
    <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="onFile" />
  </div>
</template>

<style scoped>
.import-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; background: var(--bg-panel); border: 1px solid var(--border-line);
  border-radius: 6px;
}
.src { font-size: 12px; color: var(--text-secondary); }
.src.live { color: var(--accent-green); }
.btns { margin-left: auto; display: flex; gap: 6px; }
.ib {
  padding: 5px 12px; font-size: 12px; cursor: pointer;
  border: 1px solid var(--border-line); border-radius: 4px;
  background: transparent; color: var(--text-secondary);
}
.ib:hover { color: var(--text-primary); border-color: var(--border-line-strong); }
.ib.primary {
  color: #061222; font-weight: 600; border-color: var(--accent-cyan);
  background: linear-gradient(135deg, var(--accent-cyan), #0099ff);
}
</style>
