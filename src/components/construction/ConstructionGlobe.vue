<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, reactive, computed } from 'vue'
import * as Cesium from 'cesium'
import { useConstructionStore } from '@/stores/construction'
import { useAlertStore } from '@/stores/alerts'
import { computeDeviation } from '@/logic/deviation'
import { computeAllocation } from '@/logic/allocation'
import { computeAlerts } from '@/logic/alerts'
import { CESIUM_ION_TOKEN, HAS_ION } from '@/config/cesium'

const container = ref<HTMLDivElement | null>(null)
const c = useConstructionStore()
const a = useAlertStore()
let viewer: Cesium.Viewer | null = null
let handler: Cesium.ScreenSpaceEventHandler | null = null
let phase = 0

const SITE = {
  upper: { lon: 119.4175, lat: 34.7285 },
  lower: { lon: 119.4255, lat: 34.7175 },
  powerhouse: { lon: 119.4210, lat: 34.7230 },
  spoil: { lon: 119.4105, lat: 34.7240 },
  borrow: { lon: 119.4310, lat: 34.7255 }
}
const ROAD_LL = [119.4175, 34.7285, 119.4150, 34.7258, 119.4140, 34.7232, 119.4175, 34.7205, 119.4220, 34.7186, 119.4255, 34.7175]
const ROAD2_LL = [119.4175, 34.7285, 119.4140, 34.7268, 119.4108, 34.7242]

// 图层显隐
const layers = reactive({ reservoir: true, dam: true, yard: true, road: true, vehicle: true })
const ds: Record<string, Cesium.CustomDataSource> = {}

// 点选要素
const selectedKey = ref<string | null>(null)

function ring(lon: number, lat: number, rx: number, ry: number, n = 44): number[] {
  const out: number[] = []
  const dLat = ry / 111320
  const dLon = rx / (111320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= n; i++) {
    const ang = (i / n) * Math.PI * 2
    out.push(lon + Math.cos(ang) * dLon, lat + Math.sin(ang) * dLat)
  }
  return out
}


// 点选要素信息(设计/实测/进度/关联预警)
const featureInfo = computed(() => {
  const key = selectedKey.value
  if (!key) return null
  const dev = computeDeviation(c.cutZones, c.fillZones, c.currentMonth)
  const alloc = computeAllocation(c.cutZones, c.fillZones)
  const alerts = computeAlerts(
    { deviation: dev, allocation: alloc, slopeDisp: c.slopeDisp, stockPct: c.stockPct, spoilPct: c.spoilPct },
    a.thresholds
  ).filter((x) => !a.handled[x.id])

  const find = (id: string) => dev.rows.find((r) => r.id === id)
  if (key === 'upper') {
    const cut = find('upper'); const fill = find('upperDam')
    return {
      title: '上水库 · 库盆开挖 + 面板堆石坝', rows: [
        ['开挖设计 / 实测', `${cut?.designM3 ?? '-'} / ${cut?.actualM3 ?? '-'} 万m³`],
        ['开挖进度', `${cut ? (cut.actualProgress * 100).toFixed(0) : '-'}%`],
        ['坝体填筑设计 / 实测', `${fill?.designM3 ?? '-'} / ${fill?.actualM3 ?? '-'} 万m³`],
        ['填筑进度', `${fill ? (fill.actualProgress * 100).toFixed(0) : '-'}%`]
      ],
      alerts: alerts.filter((x) => x.id.includes('upper') || x.category === '安全监测').map((x) => x.message)
    }
  }
  if (key === 'lower') {
    const cut = find('lower'); const fill = find('lowerDam')
    return {
      title: '下水库 · 库盆开挖 + 围堰/坝', rows: [
        ['开挖设计 / 实测', `${cut?.designM3 ?? '-'} / ${cut?.actualM3 ?? '-'} 万m³`],
        ['开挖进度', `${cut ? (cut.actualProgress * 100).toFixed(0) : '-'}%`],
        ['填筑设计 / 实测', `${fill?.designM3 ?? '-'} / ${fill?.actualM3 ?? '-'} 万m³`],
        ['填筑进度', `${fill ? (fill.actualProgress * 100).toFixed(0) : '-'}%`]
      ],
      alerts: alerts.filter((x) => x.id.includes('lower')).map((x) => x.message)
    }
  }
  if (key === 'spoil') return {
    title: '1#弃渣场', rows: [
      ['容量', `${c.spoilUsed.toFixed(0)} / 240 万m³`],
      ['使用率', `${c.spoilPct.toFixed(0)}%`]
    ], alerts: alerts.filter((x) => x.id === 'spoil' || x.id === 'spoilrate').map((x) => x.message)
  }
  if (key === 'borrow') return {
    title: '垫层料加工区(料场)', rows: [['当前外购/加工', `${c.borrowUsed.toFixed(0)} 万m³`]],
    alerts: alerts.filter((x) => x.id === 'borrow').map((x) => x.message)
  }
  if (key === 'powerhouse') return { title: '地下厂房 1200MW', rows: [['装机', '4×300 MW'], ['形象进度', `${c.overallProgress.toFixed(1)}%`]], alerts: [] }
  return null
})

function applyLayer(name: keyof typeof layers) {
  if (ds[name]) ds[name].show = layers[name]
}


onMounted(async () => {
  if (!container.value) return
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN
  viewer = new Cesium.Viewer(container.value, {
    terrain: HAS_ION ? Cesium.Terrain.fromWorldTerrain() : undefined,
    baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
    navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
    selectionIndicator: false, infoBox: false, creditContainer: document.createElement('div')
  })
  const scene = viewer.scene
  scene.globe.enableLighting = true
  try { (scene as any).verticalExaggeration = 1.6 } catch {}
  if (scene.skyAtmosphere) scene.skyAtmosphere.brightnessShift = -0.05
  if (HAS_ION) {
    try {
      scene.imageryLayers.removeAll()
      scene.imageryLayers.add(Cesium.ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(2), undefined))
    } catch {}
  }

  ;['reservoir', 'dam', 'yard', 'road', 'vehicle'].forEach((k) => {
    ds[k] = new Cesium.CustomDataSource(k); viewer!.dataSources.add(ds[k])
  })
  buildOverlay()

  // 点选查询
  handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
  handler.setInputAction((e: any) => {
    const picked = scene.pick(e.position)
    const id = picked?.id?.id
    if (typeof id === 'string' && id.startsWith('feat-')) selectedKey.value = id.slice(5)
    else selectedKey.value = null
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(SITE.lower.lon + 0.018, SITE.lower.lat - 0.012, 3200),
    orientation: { heading: Cesium.Math.toRadians(315), pitch: Cesium.Math.toRadians(-34), roll: 0 },
    duration: 2.6
  })
  scene.preRender.addEventListener(() => { phase = (phase + (c.playing ? 0.0016 : 0.0006)) % 1 })
})

function zone(layer: string, key: string | null, lon: number, lat: number, rx: number, ry: number, fill: string, line: string) {
  const pts = ring(lon, lat, rx, ry)
  ds[layer].entities.add({
    id: key ? `feat-${key}` : undefined,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(pts),
      material: Cesium.Color.fromCssColorString(fill).withAlpha(0.45),
      classificationType: Cesium.ClassificationType.TERRAIN
    }
  })
  ds[layer].entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(pts), width: 3, clampToGround: true,
      material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.35, color: Cesium.Color.fromCssColorString(line) })
    }
  })
}

function label(layer: string, key: string | null, text: string, lon: number, lat: number, color: string) {
  ds[layer].entities.add({
    id: key ? `feat-${key}` : undefined,
    position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
    point: { pixelSize: 8, color: Cesium.Color.fromCssColorString(color), heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: {
      text, font: 'bold 13px sans-serif', fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString('#02060c'), outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -12), heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  })
}


function buildOverlay() {
  // 库区
  zone('reservoir', 'upper', SITE.upper.lon, SITE.upper.lat, 230, 180, '#16b6ff', '#aee7ff')
  zone('reservoir', 'lower', SITE.lower.lon, SITE.lower.lat, 300, 220, '#1184e0', '#9fd0ff')
  label('reservoir', 'upper', '上水库 · 库盆开挖+面板堆石坝', SITE.upper.lon, SITE.upper.lat, '#00ff88')
  label('reservoir', 'lower', '下水库', SITE.lower.lon, SITE.lower.lat, '#19a0ff')
  label('reservoir', 'powerhouse', '地下厂房 1200MW', SITE.powerhouse.lon, SITE.powerhouse.lat, '#ff9d00')

  // 大坝轴线
  ds.dam.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(ring(SITE.upper.lon, SITE.upper.lat - 0.0014, 240, 30, 8).slice(0, 18)),
      width: 8, clampToGround: true, material: Cesium.Color.fromCssColorString('#d6dae0')
    }
  })

  // 场地
  zone('yard', 'spoil', SITE.spoil.lon, SITE.spoil.lat, 160, 130, '#a78bfa', '#cdbcff')
  zone('yard', 'borrow', SITE.borrow.lon, SITE.borrow.lat, 120, 100, '#ffce5c', '#ffe6a3')
  label('yard', 'spoil', '1#弃渣场', SITE.spoil.lon, SITE.spoil.lat, '#a78bfa')
  label('yard', 'borrow', '垫层料加工区', SITE.borrow.lon, SITE.borrow.lat, '#ffce5c')

  // 道路
  for (const road of [ROAD_LL, ROAD2_LL]) {
    ds.road.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(road), width: 5, clampToGround: true,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString('#e0b43a').withAlpha(0.95),
          outlineColor: Cesium.Color.fromCssColorString('#4a3a10'), outlineWidth: 1.5
        })
      }
    })
  }

  // 车辆
  const carts: Cesium.Cartographic[] = []
  for (let i = 0; i < ROAD_LL.length; i += 2) carts.push(Cesium.Cartographic.fromDegrees(ROAD_LL[i], ROAD_LL[i + 1]))
  for (let k = 0; k < 6; k++) {
    const base = k / 6
    ds.vehicle.entities.add({
      position: new Cesium.CallbackPositionProperty(() => {
        const t = (base + phase * 4) % 1
        const seg = (carts.length - 1) * t; const i = Math.floor(seg); const f = seg - i
        const aa = carts[i], bb = carts[Math.min(i + 1, carts.length - 1)]
        return Cesium.Cartesian3.fromRadians(aa.longitude + (bb.longitude - aa.longitude) * f, aa.latitude + (bb.latitude - aa.latitude) * f, 0)
      }, false),
      point: { pixelSize: 8, color: Cesium.Color.fromCssColorString('#ffc02a'), outlineColor: Cesium.Color.fromCssColorString('#5a3e00'), outlineWidth: 1, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND }
    })
  }
}

onBeforeUnmount(() => {
  handler?.destroy(); handler = null
  viewer?.destroy(); viewer = null
})
</script>


<template>
  <div class="globe-wrap">
    <div ref="container" class="globe-canvas" />

    <!-- 图层控制 -->
    <div class="layer-ctrl">
      <div class="lc-title">图层</div>
      <label v-for="(v, k) in layers" :key="k" class="lc-item">
        <input type="checkbox" v-model="layers[k]" @change="applyLayer(k)" />
        <span>{{ ({ reservoir: '库区', dam: '大坝', yard: '场地', road: '道路', vehicle: '车辆' } as any)[k] }}</span>
      </label>
    </div>

    <!-- 点选信息卡 -->
    <transition name="fade">
      <div v-if="featureInfo" class="info-card">
        <div class="ic-head">
          <span>{{ featureInfo.title }}</span>
          <span class="ic-close" @click="selectedKey = null">×</span>
        </div>
        <div class="ic-body">
          <div v-for="(r, i) in featureInfo.rows" :key="i" class="ic-row">
            <span class="ic-k">{{ r[0] }}</span><span class="ic-v">{{ r[1] }}</span>
          </div>
          <div v-if="featureInfo.alerts.length" class="ic-alerts">
            <div class="ic-alert-t">关联预警 {{ featureInfo.alerts.length }}</div>
            <div v-for="(al, i) in featureInfo.alerts" :key="i" class="ic-alert">⚠ {{ al }}</div>
          </div>
        </div>
      </div>
    </transition>

    <div class="globe-note">
      🛰️ 真实地形+卫星影像 · 宿城/云台山 ｜ <b>点击库区/弃渣场/料场</b>查看设计·实测·进度·预警 ｜ 坐标估算待红线对位
    </div>
  </div>
</template>

<style scoped>
.globe-wrap { position: relative; width: 100%; height: 100%; }
.globe-canvas { width: 100%; height: 100%; }
.layer-ctrl {
  position: absolute; top: 14px; left: 14px; z-index: 6;
  background: rgba(8,18,32,0.8); border: 1px solid var(--border-line);
  border-radius: 6px; padding: 8px 12px; backdrop-filter: blur(8px);
}
.lc-title { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; letter-spacing: 1px; }
.lc-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-primary); cursor: pointer; padding: 2px 0; }
.lc-item input { accent-color: var(--accent-cyan); }
.info-card {
  position: absolute; top: 14px; right: 14px; z-index: 7; width: 280px;
  background: var(--bg-panel-strong); border: 1px solid var(--border-line-strong);
  border-radius: 6px; box-shadow: var(--shadow-glow); overflow: hidden;
}
.ic-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border-line); font-size: 13px; font-weight: 600; color: var(--text-primary); }
.ic-close { cursor: pointer; color: var(--text-dim); font-size: 18px; line-height: 1; }
.ic-close:hover { color: var(--accent-red); }
.ic-body { padding: 10px 12px; }
.ic-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
.ic-k { color: var(--text-secondary); }
.ic-v { color: var(--text-primary); font-variant-numeric: tabular-nums; }
.ic-alerts { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-line); }
.ic-alert-t { font-size: 11px; color: var(--accent-orange); margin-bottom: 4px; }
.ic-alert { font-size: 11px; color: #ffce9e; line-height: 1.5; }
.globe-note { position: absolute; left: 12px; bottom: 12px; z-index: 5; font-size: 11px; color: var(--text-secondary); background: rgba(8,18,32,0.72); border: 1px solid var(--border-line); padding: 6px 10px; border-radius: 4px; pointer-events: none; }
.globe-note b { color: var(--accent-cyan); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
