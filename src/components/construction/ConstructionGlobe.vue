<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { useConstructionStore } from '@/stores/construction'
import { CESIUM_ION_TOKEN, HAS_ION } from '@/config/cesium'

const container = ref<HTMLDivElement | null>(null)
const c = useConstructionStore()
let viewer: Cesium.Viewer | null = null
let phase = 0

// 真实坐标: 连云港连云区宿城街道 · 云台山(东北段近海), 约 119.42E 34.73N
const SITE = {
  upper: { lon: 119.4175, lat: 34.7285 },
  lower: { lon: 119.4255, lat: 34.7175 },
  powerhouse: { lon: 119.4210, lat: 34.7230 },
  spoil: { lon: 119.4105, lat: 34.7240 },
  borrow: { lon: 119.4310, lat: 34.7255 },
  switchyard: { lon: 119.4180, lat: 34.7190 }
}
const ROAD_LL: number[] = [
  119.4175, 34.7285, 119.4150, 34.7258, 119.4140, 34.7232,
  119.4175, 34.7205, 119.4220, 34.7186, 119.4255, 34.7175
]
const ROAD2_LL: number[] = [
  119.4175, 34.7285, 119.4140, 34.7268, 119.4108, 34.7242
]

function ring(lon: number, lat: number, rx: number, ry: number, n = 44): number[] {
  const out: number[] = []
  const dLat = ry / 111320
  const dLon = rx / (111320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push(lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat)
  }
  return out
}


onMounted(async () => {
  if (!container.value) return
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN

  viewer = new Cesium.Viewer(container.value, {
    terrain: HAS_ION ? Cesium.Terrain.fromWorldTerrain() : undefined,
    baseLayerPicker: false, geocoder: false, homeButton: false,
    sceneModePicker: false, navigationHelpButton: false, animation: false,
    timeline: false, fullscreenButton: false, selectionIndicator: false,
    infoBox: false, creditContainer: document.createElement('div')
  })
  const scene = viewer.scene
  scene.globe.enableLighting = true
  // 地形夸张, 增强山势观感
  try { (scene as any).verticalExaggeration = 1.6 } catch (e) { /* older api */ }
  if (scene.skyAtmosphere) scene.skyAtmosphere.brightnessShift = -0.05

  if (HAS_ION) {
    try {
      scene.imageryLayers.removeAll()
      scene.imageryLayers.add(
        Cesium.ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(2), undefined)
      )
    } catch (e) { /* keep default */ }
  }

  buildOverlay()

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(SITE.lower.lon + 0.018, SITE.lower.lat - 0.012, 3200),
    orientation: {
      heading: Cesium.Math.toRadians(315),
      pitch: Cesium.Math.toRadians(-34),
      roll: 0
    },
    duration: 2.6
  })

  scene.preRender.addEventListener(() => { phase = (phase + (c.playing ? 0.0016 : 0.0006)) % 1 })
})

// 贴地图斑(随地形起伏), 不再用漂浮实体
function zone(
  ds: Cesium.CustomDataSource, name: string, lon: number, lat: number,
  rx: number, ry: number, fill: string, line: string
) {
  const pts = ring(lon, lat, rx, ry)
  ds.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(pts),
      material: Cesium.Color.fromCssColorString(fill).withAlpha(0.45),
      classificationType: Cesium.ClassificationType.TERRAIN
    }
  })
  ds.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(pts),
      width: 3, clampToGround: true,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.35, color: Cesium.Color.fromCssColorString(line)
      })
    }
  })
}


function buildOverlay() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('overlay')
  viewer.dataSources.add(ds)

  // 库区范围(贴地)
  zone(ds, '上水库', SITE.upper.lon, SITE.upper.lat, 230, 180, '#16b6ff', '#aee7ff')
  zone(ds, '下水库', SITE.lower.lon, SITE.lower.lat, 300, 220, '#1184e0', '#9fd0ff')
  // 弃渣场 / 料场
  zone(ds, '弃渣场', SITE.spoil.lon, SITE.spoil.lat, 160, 130, '#a78bfa', '#cdbcff')
  zone(ds, '料场', SITE.borrow.lon, SITE.borrow.lat, 120, 100, '#ffce5c', '#ffe6a3')

  // 大坝轴线(上库下游缘, 贴地粗线)
  ds.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(
        ring(SITE.upper.lon, SITE.upper.lat - 0.0014, 240, 30, 8).slice(0, 18)
      ),
      width: 8, clampToGround: true,
      material: Cesium.Color.fromCssColorString('#d6dae0')
    }
  })

  // 运输道路(贴地)
  for (const road of [ROAD_LL, ROAD2_LL]) {
    ds.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(road),
        width: 5, clampToGround: true,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString('#e0b43a').withAlpha(0.95),
          outlineColor: Cesium.Color.fromCssColorString('#4a3a10'), outlineWidth: 1.5
        })
      }
    })
  }

  // 渣土车(贴地移动点)
  const roadCarts = [] as Cesium.Cartographic[]
  for (let i = 0; i < ROAD_LL.length; i += 2) roadCarts.push(Cesium.Cartographic.fromDegrees(ROAD_LL[i], ROAD_LL[i + 1]))
  for (let k = 0; k < 6; k++) {
    const base = k / 6
    ds.entities.add({
      position: new Cesium.CallbackPositionProperty(() => {
        const t = (base + phase * 4) % 1
        const seg = (roadCarts.length - 1) * t
        const i = Math.floor(seg)
        const f = seg - i
        const a = roadCarts[i], b = roadCarts[Math.min(i + 1, roadCarts.length - 1)]
        return Cesium.Cartesian3.fromRadians(
          a.longitude + (b.longitude - a.longitude) * f,
          a.latitude + (b.latitude - a.latitude) * f, 0
        )
      }, false),
      point: {
        pixelSize: 8, color: Cesium.Color.fromCssColorString('#ffc02a'),
        outlineColor: Cesium.Color.fromCssColorString('#5a3e00'), outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: 0
      }
    })
  }

  // 标注(贴地)
  label(ds, '上水库 · 库盆开挖+面板堆石坝', SITE.upper.lon, SITE.upper.lat, '#00ff88')
  label(ds, '下水库', SITE.lower.lon, SITE.lower.lat, '#19a0ff')
  label(ds, '地下厂房 1200MW', SITE.powerhouse.lon, SITE.powerhouse.lat, '#ff9d00')
  label(ds, '1#弃渣场', SITE.spoil.lon, SITE.spoil.lat, '#a78bfa')
  label(ds, '垫层料加工区', SITE.borrow.lon, SITE.borrow.lat, '#ffce5c')
}

function label(ds: Cesium.CustomDataSource, text: string, lon: number, lat: number, color: string) {
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
    point: { pixelSize: 7, color: Cesium.Color.fromCssColorString(color), heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: {
      text, font: 'bold 13px sans-serif', fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString('#02060c'), outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  })
}

onBeforeUnmount(() => { viewer?.destroy(); viewer = null })
</script>

<template>
  <div class="globe-wrap">
    <div ref="container" class="globe-canvas" />
    <div class="globe-note">
      🛰️ 真实地形(Cesium World Terrain,地形增强1.6×)+ 卫星影像 · 连云港宿城/云台山<br />
      施工要素以贴地 GIS 图斑表达(库区/弃渣/料场/道路);坐标为估算,待红线数据精确对位
    </div>
  </div>
</template>

<style scoped>
.globe-wrap { position: relative; width: 100%; height: 100%; }
.globe-canvas { width: 100%; height: 100%; }
.globe-note {
  position: absolute; left: 12px; bottom: 12px; z-index: 5;
  font-size: 11px; line-height: 1.5; color: var(--text-secondary);
  background: rgba(8, 18, 32, 0.72); border: 1px solid var(--border-line);
  padding: 6px 10px; border-radius: 4px; pointer-events: none;
}
</style>
