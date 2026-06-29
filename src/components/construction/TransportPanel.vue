<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMasterDataStore } from '@/stores/masterData'
import { genTrips, tripStats, type TripRecord } from '@/logic/transport'
import '@/styles/panel.css'

const m = useMasterDataStore()
const trips = ref<TripRecord[]>([])
const selected = ref<string>('')

onMounted(() => {
  trips.value = genTrips(m.vehicles.map((v) => v.plate))
  selected.value = m.vehicles[0]?.plate || ''
})

const stats = computed(() => tripStats(trips.value))
const onlineCount = computed(() => m.vehicles.filter((v) => v.status === '在线').length)
const selTrips = computed(() => trips.value.filter((t) => t.plate === selected.value))

function refresh() { trips.value = genTrips(m.vehicles.map((v) => v.plate)) }
</script>

<template>
  <div class="tp-wrap">
    <div class="kpis">
      <div class="kpi"><div class="kv">{{ onlineCount }}/{{ m.vehicles.length }}</div><div class="kl">在场/在线车辆</div></div>
      <div class="kpi"><div class="kv">{{ stats.count }}</div><div class="kl">运输趟次(近班)</div></div>
      <div class="kpi"><div class="kv">{{ stats.totalVol }}<small>m³</small></div><div class="kl">运量(抬斗折方)</div></div>
      <div class="kpi"><div class="kv">{{ stats.totalWeight }}<small>t</small></div><div class="kl">运量(称重)</div></div>
      <div class="kpi"><div class="kv" :class="stats.abnormal ? 'crit' : 'okc'">{{ stats.abnormal }}</div><div class="kl">称重/抬斗异常</div></div>
    </div>

    <div class="cols">
      <section class="panel">
        <div class="panel-header">
          <span class="panel-title">运输记录(称重 × 抬斗识别)</span>
          <button class="mini" @click="refresh">刷新</button>
        </div>
        <div class="tbl-scroll">
          <table>
            <thead><tr><th>时间</th><th>车牌</th><th>路线</th><th>料质</th><th>称重<small>t</small></th><th>抬斗<small>次</small></th><th>折方<small>m³</small></th><th>校验</th></tr></thead>
            <tbody>
              <tr v-for="t in trips" :key="t.id" :class="{ bad: !t.consistent }">
                <td>{{ t.time }}</td><td>{{ t.plate }}</td>
                <td>{{ t.from }}→{{ t.to }}</td><td>{{ t.material }}</td>
                <td class="num">{{ t.weightT }}</td><td class="num">{{ t.buckets }}</td><td class="num">{{ t.volM3 }}</td>
                <td><span class="st" :class="t.consistent ? 'ok' : 'crit'">{{ t.consistent ? '一致' : '异常' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel veh-panel">
        <div class="panel-header"><span class="panel-title">车辆状态 · 轨迹回放</span></div>
        <div class="veh-list">
          <div v-for="v in m.vehicles" :key="v.id" class="veh" :class="{ on: selected === v.plate }" @click="selected = v.plate">
            <span class="dot" :class="v.status === '在线' ? 'g' : v.status === '维修' ? 'r' : 'd'" />
            <span class="vp">{{ v.plate }}</span>
            <span class="vt">{{ v.type }}</span>
            <span class="vs">{{ v.status }}</span>
          </div>
        </div>
        <div class="playback">
          <div class="pb-title">{{ selected }} · 近班 {{ selTrips.length }} 趟</div>
          <svg viewBox="0 0 300 120" class="pb-svg">
            <polyline points="20,100 80,40 160,70 240,30 280,90" fill="none" stroke="#2a3a52" stroke-width="6" stroke-linecap="round" />
            <polyline points="20,100 80,40 160,70 240,30 280,90" fill="none" stroke="#e0b43a" stroke-width="3" stroke-dasharray="6 10" class="route" />
            <circle r="5" fill="#ffc02a" stroke="#5a3e00">
              <animateMotion dur="4s" repeatCount="indefinite" path="M20,100 L80,40 L160,70 L240,30 L280,90" />
            </circle>
          </svg>
          <div class="pb-note">轨迹为路线示意;接入真实 GPS/北斗后回放真实行驶轨迹</div>
        </div>
      </section>
    </div>
  </div>
</template>


<style scoped>
.tp-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: #061222; overflow: hidden; }
.kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; flex-shrink: 0; }
.kpi { background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 6px; padding: 10px 12px; text-align: center; }
.kv { font-size: 20px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.kv small { font-size: 11px; color: var(--text-dim); margin-left: 2px; font-weight: 400; }
.kv.crit { color: var(--accent-red); } .kv.okc { color: var(--accent-green); }
.kl { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
.cols { flex: 1; display: grid; grid-template-columns: 1.7fr 1fr; gap: 10px; min-height: 0; }
.panel { display: flex; flex-direction: column; min-height: 0; }
.mini { font-size: 11px; padding: 3px 10px; border: 1px solid var(--border-line); border-radius: 4px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.tbl-scroll { overflow: auto; flex: 1; padding: 0 4px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
thead th { position: sticky; top: 0; background: var(--bg-panel-strong); color: var(--text-secondary); font-weight: 500; text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--border-line); white-space: nowrap; }
thead th small { color: var(--text-dim); margin-left: 2px; }
tbody td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-primary); }
tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
tbody tr.bad { background: rgba(255,56,96,0.07); }
tbody tr:hover { background: rgba(0,212,255,0.05); }
.st { font-size: 10px; padding: 1px 7px; border-radius: 3px; }
.st.ok { background: rgba(0,255,136,0.16); color: var(--accent-green); }
.st.crit { background: rgba(255,56,96,0.16); color: var(--accent-red); }
.veh-panel { min-height: 0; }
.veh-list { overflow: auto; max-height: 180px; padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
.veh { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.veh:hover, .veh.on { background: rgba(0,212,255,0.08); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot.g { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
.dot.r { background: var(--accent-red); }
.dot.d { background: var(--text-dim); }
.vp { color: var(--text-primary); font-weight: 600; }
.vt { color: var(--text-secondary); }
.vs { margin-left: auto; color: var(--text-secondary); }
.playback { padding: 10px 12px; border-top: 1px solid var(--border-line); }
.pb-title { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.pb-svg { width: 100%; height: 110px; }
.route { animation: dash 1s linear infinite; }
@keyframes dash { to { stroke-dashoffset: -16; } }
.pb-note { font-size: 10px; color: var(--text-dim); margin-top: 4px; }
</style>
