<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { useConstructionStore } from '@/stores/construction'
import { CESIUM_ION_TOKEN, HAS_ION } from '@/config/cesium'

const container = ref<HTMLDivElement | null>(null)
const c = useConstructionStore()
let viewer: Cesium.Viewer | null = null
let flowPhase = 0
let truckPath: Cesium.Cartesian3[] = []

// 真实经纬度场地布置(云台山宿城一带)
const SITE = {
  upper: { lon: 119.3505, lat: 34.7262 }, // 上水库(山顶)
  lower: { lon: 119.3508, lat: 34.7105 }, // 下水库(谷地)
  powerhouse: { lon: 119.3506, lat: 34.7188 },
  spoil: { lon: 119.3442, lat: 34.7150 }, // 弃渣场
  borrow: { lon: 119.3572, lat: 34.7165 }, // 料场
  switchyard: { lon: 119.3460, lat: 34.7120 }
}
// 运输路线(上库→沿山而下→下库/坝, 途经弃渣场)
const ROAD_LL: [number, number][] = [
  [119.3505, 34.7262],
  [119.3480, 34.7235],
  [119.3455, 34.7200],
  [119.3460, 34.7160],
  [119.3490, 34.7130],
  [119.3508, 34.7108]
]

function circleDeg(lon: number, lat: number, radius: number, n = 40): number[] {
  const out: number[] = []
  const dLat = radius / 111320
  const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i < n; i++) {
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
  if (scene.skyAtmosphere) scene.skyAtmosphere.brightnessShift = -0.1

  // 卫星影像(Ion: Bing Aerial)
  if (HAS_ION) {
    try {
      const layer = Cesium.ImageryLayer.fromProviderAsync(
        Cesium.IonImageryProvider.fromAssetId(2), undefined
      )
      scene.imageryLayers.removeAll()
      scene.imageryLayers.add(layer)
    } catch (e) { /* 影像加载失败时保留默认 */ }
  }

  await buildScene()

  // 飞到场地
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(SITE.lower.lon + 0.012, SITE.lower.lat - 0.006, 2600),
    orientation: {
      heading: Cesium.Math.toRadians(320),
      pitch: Cesium.Math.toRadians(-32),
      roll: 0
    },
    duration: 2.5
  })

  scene.preRender.addEventListener(() => {
    flowPhase += c.playing ? 0.01 : 0.004
  })
})

async function sampleHeights(lls: [number, number][]): Promise<number[]> {
  if (!viewer || !HAS_ION) return lls.map(() => 0)
  try {
    const cartos = lls.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat))
    await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartos)
    return cartos.map((c2) => c2.height)
  } catch (e) {
    return lls.map(() => 0)
  }
}


function lerpAlong(path: Cesium.Cartesian3[], t: number): Cesium.Cartesian3 {
  if (path.length < 2) return path[0] || Cesium.Cartesian3.ZERO
  const seg = (path.length - 1) * Math.max(0, Math.min(0.9999, t))
  const i = Math.floor(seg)
  return Cesium.Cartesian3.lerp(path[i], path[i + 1], seg - i, new Cesium.Cartesian3())
}

async function buildScene() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('construction')
  viewer.dataSources.add(ds)

  // 采样真实地形高程
  const [upperH, lowerH, spoilH, borrowH, phH] = await sampleHeights([
    [SITE.upper.lon, SITE.upper.lat],
    [SITE.lower.lon, SITE.lower.lat],
    [SITE.spoil.lon, SITE.spoil.lat],
    [SITE.borrow.lon, SITE.borrow.lat],
    [SITE.powerhouse.lon, SITE.powerhouse.lat]
  ])
  const roadH = await sampleHeights(ROAD_LL)
  truckPath = ROAD_LL.map(([lon, lat], i) =>
    Cesium.Cartesian3.fromDegrees(lon, lat, (roadH[i] || 0) + 4)
  )

  const damFull = 32
  const upperFloor = upperH - 22

  // 上水库三维水体(顶面随蓄水进度上升)
  ds.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(circleDeg(SITE.upper.lon, SITE.upper.lat, 150))
      ),
      perPositionHeight: false,
      height: new Cesium.CallbackProperty(
        () => upperFloor + 2 + c.dam.progress * (damFull - 4), false
      ),
      material: Cesium.Color.fromCssColorString('#1fa8ff').withAlpha(0.7),
      outline: true, outlineColor: Cesium.Color.fromCssColorString('#aee7ff')
    }
  })
  // 库盆开挖轮廓(随开挖进度显现的盆地边线)
  ds.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(circleDeg(SITE.upper.lon, SITE.upper.lat, 165))
      ),
      height: upperFloor, extrudedHeight: upperH,
      material: Cesium.Color.fromCssColorString('#6b5e44').withAlpha(0.0),
      outline: true, outlineColor: Cesium.Color.fromCssColorString('#ffce5c').withAlpha(0.8)
    }
  })

  // 面板堆石坝(上库下游缘, 高度随填筑进度)
  const damCenter = { lon: SITE.upper.lon, lat: SITE.upper.lat - 0.0016 }
  ds.entities.add({
    position: new Cesium.CallbackPositionProperty(() =>
      Cesium.Cartesian3.fromDegrees(
        damCenter.lon, damCenter.lat,
        (upperH - damFull) + (damFull * c.dam.progress) / 2
      ), false),
    box: {
      dimensions: new Cesium.CallbackProperty(() =>
        new Cesium.Cartesian3(300, 40, Math.max(1, damFull * c.dam.progress)), false),
      material: Cesium.Color.fromCssColorString('#9aa0a8'),
      outline: true, outlineColor: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.5)
    }
  })

  // 下水库水体
  ds.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(circleDeg(SITE.lower.lon, SITE.lower.lat, 190))
      ),
      perPositionHeight: false,
      height: lowerH + 1,
      material: Cesium.Color.fromCssColorString('#1184e0').withAlpha(0.7),
      outline: true, outlineColor: Cesium.Color.fromCssColorString('#9fd0ff')
    }
  })


  // 运输道路(贴地)
  ds.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(ROAD_LL.flat()),
      width: 6, clampToGround: true,
      material: new Cesium.PolylineOutlineMaterialProperty({
        color: Cesium.Color.fromCssColorString('#caa23a').withAlpha(0.9),
        outlineColor: Cesium.Color.fromCssColorString('#5a4a18'), outlineWidth: 1.5
      })
    }
  })

  // 渣土车(沿路移动, 满载下山)
  for (let i = 0; i < 8; i++) {
    const base = i / 8
    ds.entities.add({
      position: new Cesium.CallbackPositionProperty(() => {
        let t = (base + flowPhase) % 1
        return lerpAlong(truckPath, t)
      }, false),
      point: {
        pixelSize: 9,
        color: Cesium.Color.fromCssColorString('#ffc02a'),
        outlineColor: Cesium.Color.fromCssColorString('#6a4e00'), outlineWidth: 1
      }
    })
  }

  // 弃渣场(锥堆) + 料场
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(SITE.spoil.lon, SITE.spoil.lat, spoilH + 14),
    cylinder: {
      length: 28, topRadius: 4, bottomRadius: 60,
      material: Cesium.Color.fromCssColorString('#8a7a5c').withAlpha(0.95)
    }
  })
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(SITE.borrow.lon, SITE.borrow.lat, borrowH + 8),
    box: {
      dimensions: new Cesium.Cartesian3(90, 70, 16),
      material: Cesium.Color.fromCssColorString('#b89a5a').withAlpha(0.9)
    }
  })

  // 地下厂房(半透明洞室)
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(SITE.powerhouse.lon, SITE.powerhouse.lat, phH - 40),
    box: {
      dimensions: new Cesium.Cartesian3(180, 60, 90),
      material: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.16),
      outline: true, outlineColor: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.6)
    }
  })

  addLabel(ds, SITE.upper.lon, SITE.upper.lat, upperH + 40, '上水库 · 库盆开挖+面板堆石坝', '#00ff88')
  addLabel(ds, SITE.lower.lon, SITE.lower.lat, lowerH + 30, '下水库', '#19a0ff')
  addLabel(ds, SITE.powerhouse.lon, SITE.powerhouse.lat, phH + 30, '地下厂房', '#ff9d00')
  addLabel(ds, SITE.spoil.lon, SITE.spoil.lat, spoilH + 40, '1#弃渣场', '#a78bfa')
  addLabel(ds, SITE.borrow.lon, SITE.borrow.lat, borrowH + 28, '垫层料加工区', '#ffce5c')
}

function addLabel(ds: Cesium.CustomDataSource, lon: number, lat: number, h: number, text: string, color: string) {
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, h),
    point: { pixelSize: 7, color: Cesium.Color.fromCssColorString(color), disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: {
      text, font: 'bold 13px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString('#02060c'), outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -10),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  })
}

onBeforeUnmount(() => {
  viewer?.destroy()
  viewer = null
})
</script>

<template>
  <div class="globe-wrap">
    <div ref="container" class="globe-canvas" />
    <div class="globe-note">
      🛰️ 真实地形 + 卫星影像（Cesium World Terrain）｜ 施工要素按真实经纬度叠加<br />
      照片级实景（路/树/现场细节）需接入项目无人机倾斜摄影成果（3D Tiles）
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
