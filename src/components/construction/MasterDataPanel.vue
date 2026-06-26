<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMasterDataStore } from '@/stores/masterData'
import { ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElMessageBox, ElMessage } from 'element-plus'
import '@/styles/panel.css'

const m = useMasterDataStore()

interface Col { key: string; label: string; type?: 'number' | 'select'; options?: string[]; unit?: string }
type Cat = 'yards' | 'roads' | 'vehicles' | 'equips'

const cats: { key: Cat; label: string; cols: Col[] }[] = [
  { key: 'yards', label: '料场/堆场/渣场', cols: [
    { key: 'name', label: '名称' },
    { key: 'type', label: '类型', type: 'select', options: ['料场', '中转场', '弃渣场'] },
    { key: 'capacity', label: '容量', type: 'number', unit: '万m³' },
    { key: 'used', label: '已用', type: 'number', unit: '万m³' },
    { key: 'material', label: '允许料质' },
    { key: 'status', label: '状态' }
  ] },
  { key: 'roads', label: '施工道路', cols: [
    { key: 'name', label: '名称' }, { key: 'from', label: '起点' }, { key: 'to', label: '终点' },
    { key: 'lengthKm', label: '长度', type: 'number', unit: 'km' },
    { key: 'gradePct', label: '坡度', type: 'number', unit: '%' },
    { key: 'capacity', label: '通行能力', type: 'number', unit: '车/h' },
    { key: 'status', label: '状态' }
  ] },
  { key: 'vehicles', label: '车辆', cols: [
    { key: 'plate', label: '车牌' }, { key: 'type', label: '车型' },
    { key: 'capacityM3', label: '载量', type: 'number', unit: 'm³' },
    { key: 'driver', label: '司机' },
    { key: 'status', label: '状态', type: 'select', options: ['在线', '离线', '维修'] }
  ] },
  { key: 'equips', label: '设备', cols: [
    { key: 'name', label: '名称' }, { key: 'type', label: '类型' }, { key: 'spec', label: '规格' },
    { key: 'location', label: '位置' },
    { key: 'status', label: '状态', type: 'select', options: ['运行', '待机', '检修'] }
  ] }
]

const activeCat = ref<Cat>('yards')
const curDef = computed(() => cats.find((c) => c.key === activeCat.value)!)
const rows = computed<any[]>(() => (m as any)[activeCat.value])

const dialogVisible = ref(false)
const editing = ref<any>({})
const isNew = ref(false)

function openAdd() {
  isNew.value = true
  const obj: any = { id: activeCat.value[0].toUpperCase() + Date.now().toString().slice(-6) }
  curDef.value.cols.forEach((c) => { obj[c.key] = c.type === 'number' ? 0 : '' })
  editing.value = obj
  dialogVisible.value = true
}
function openEdit(row: any) {
  isNew.value = false
  editing.value = JSON.parse(JSON.stringify(row))
  dialogVisible.value = true
}
function save() {
  m.save(activeCat.value, JSON.parse(JSON.stringify(editing.value)))
  dialogVisible.value = false
  ElMessage.success(isNew.value ? '已新增' : '已保存')
}
async function del(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.name || row.plate || row.id}」?`, '删除确认', { type: 'warning' })
    m.remove(activeCat.value, row.id)
    ElMessage.success('已删除')
  } catch {}
}
async function resetAll() {
  try {
    await ElMessageBox.confirm('恢复全部基础资料为内置示例?', '提示', { type: 'warning' })
    m.reset(); ElMessage.success('已恢复示例')
  } catch {}
}
</script>


<template>
  <div class="md-wrap">
    <div class="md-top">
      <div class="md-cats">
        <button v-for="c in cats" :key="c.key" class="ct" :class="{ on: activeCat === c.key }" @click="activeCat = c.key">{{ c.label }}</button>
      </div>
      <div class="md-actions">
        <button class="mb" @click="resetAll">恢复示例</button>
        <button class="mb primary" @click="openAdd">+ 新增</button>
      </div>
    </div>

    <section class="panel md-tbl">
      <div class="tbl-scroll">
        <table>
          <thead>
            <tr>
              <th v-for="col in curDef.cols" :key="col.key">{{ col.label }}<small v-if="col.unit">{{ col.unit }}</small></th>
              <th class="op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td v-for="col in curDef.cols" :key="col.key" :class="{ num: col.type === 'number' }">{{ row[col.key] }}</td>
              <td class="op">
                <button class="lk" @click="openEdit(row)">编辑</button>
                <button class="lk del" @click="del(row)">删除</button>
              </td>
            </tr>
            <tr v-if="rows.length === 0"><td :colspan="curDef.cols.length + 1" class="empty">暂无数据,点击「新增」添加</td></tr>
          </tbody>
        </table>
      </div>
      <div class="md-note">基础资料台账(一库) · 增删改查 · 本地持久化 · 共 {{ rows.length }} 条</div>
    </section>

    <ElDialog v-model="dialogVisible" :title="(isNew ? '新增' : '编辑') + curDef.label" width="460px">
      <ElForm label-width="92px">
        <ElFormItem v-for="col in curDef.cols" :key="col.key" :label="col.label">
          <ElSelect v-if="col.type === 'select'" v-model="editing[col.key]" style="width:100%">
            <ElOption v-for="o in col.options" :key="o" :label="o" :value="o" />
          </ElSelect>
          <ElInput v-else v-model="editing[col.key]" :type="col.type === 'number' ? 'number' : 'text'" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <button class="mb" @click="dialogVisible = false">取消</button>
        <button class="mb primary" @click="save">保存</button>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.md-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #061222; overflow: hidden; }
.md-top { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.md-cats { display: flex; gap: 4px; }
.ct { padding: 7px 14px; font-size: 13px; cursor: pointer; border: 1px solid var(--border-line); border-radius: 5px; background: transparent; color: var(--text-secondary); }
.ct.on { color: #061222; font-weight: 600; background: linear-gradient(135deg, var(--accent-cyan), #0099ff); border-color: var(--accent-cyan); }
.md-actions { margin-left: auto; display: flex; gap: 6px; }
.mb { padding: 6px 14px; font-size: 12px; cursor: pointer; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); }
.mb.primary { color: #061222; font-weight: 600; border-color: var(--accent-cyan); background: linear-gradient(135deg, var(--accent-cyan), #0099ff); }
.md-tbl { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.tbl-scroll { overflow: auto; flex: 1; padding: 0 4px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { position: sticky; top: 0; background: var(--bg-panel-strong); color: var(--text-secondary); font-weight: 500; text-align: left; padding: 8px; border-bottom: 1px solid var(--border-line); white-space: nowrap; }
thead th small { color: var(--text-dim); margin-left: 2px; }
tbody td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
tbody tr:hover { background: rgba(0,212,255,0.05); }
.op { white-space: nowrap; }
.lk { background: none; border: none; color: var(--accent-cyan); cursor: pointer; font-size: 12px; padding: 0 6px; }
.lk.del { color: var(--accent-red); }
.empty { text-align: center; color: var(--text-dim); padding: 24px; }
.md-note { font-size: 11px; color: var(--text-secondary); padding: 8px 12px; border-top: 1px solid var(--border-line); }
</style>
