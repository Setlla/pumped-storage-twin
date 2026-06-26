<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { usePlantStore } from '@/stores/plant'
import { SITE_COORDS, PLANT_INFO, UPPER_RES, LOWER_RES } from '@/data/plantConfig'

const container = ref<HTMLDivElement | null>(null)
const plant = usePlantStore()
let viewer: Cesium.Viewer | null = null
let flowPhase = 0

// 沿折线按参数 t∈[0,1] 取点
function lerpAlong(path: Cesium.Cartesian3[], t: number): Cesium.Cartesian3 {
  if (t <= 0) return path[0]
  if (t >= 1) return path[path.length - 1]
  const seg = (path.length - 1) * t
  const i = Math.floor(seg)
  const f = seg - i
  return Cesium.Cartesian3.lerp(path[i], path[i + 1], f, new Cesium.Cartesian3())
}

// 生成圆形多边形顶点(度数组), 用于山体/水库
function circleDegrees(lon: number, lat: number, radius: number, n = 48): number[] {
  const out: number[] = []
  const dLat = radius / 111320
  const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push(lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat)
  }
  return out
}

const U = SITE_COORDS.upperReservoir
const L = SITE_COORDS.lowerReservoir
const P = SITE_COORDS.powerhouse
const SW = SITE_COORDS.switchyard


// 输水管路三维路径(引水: 上库→厂房; 尾水: 厂房→下库)
const headPath = [
  Cesium.Cartesian3.fromDegrees(U.lon, U.lat - 0.0006, U.height - 10),
  Cesium.Cartesian3.fromDegrees(U.lon, U.lat - 0.003, U.height - 120),
  Cesium.Cartesian3.fromDegrees(P.lon, P.lat + 0.0008, P.height + 40),
  Cesium.Cartesian3.fromDegrees(P.lon, P.lat, P.height + 8)
]
const tailPath = [
  Cesium.Cartesian3.fromDegrees(P.lon, P.lat, P.height + 8),
  Cesium.Cartesian3.fromDegrees(P.lon, P.lat - 0.0015, P.height - 5),
  Cesium.Cartesian3.fromDegrees(L.lon, L.lat + 0.0012, L.height + 6),
  Cesium.Cartesian3.fromDegrees(L.lon, L.lat, L.height + 2)
]

onMounted(async () => {
  if (!container.value) return

  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN
  const hasIon = !!ionToken && ionToken.length > 60

  const viewerOptions: Cesium.Viewer.ConstructorOptions = {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    selectionIndicator: false,
    infoBox: false,
    creditContainer: document.createElement('div')
  }

  if (hasIon) {
    Cesium.Ion.defaultAccessToken = ionToken as string
    viewerOptions.terrain = Cesium.Terrain.fromWorldTerrain()
  } else {
    viewerOptions.baseLayer = new Cesium.ImageryLayer(
      new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      })
    )
  }

  viewer = new Cesium.Viewer(container.value, viewerOptions)
  const scene = viewer.scene
  const sky = scene.skyAtmosphere
  if (sky) {
    sky.hueShift = -0.02
    sky.saturationShift = -0.08
    sky.brightnessShift = -0.15
  }
  scene.fog.density = 0.0004
  scene.globe.enableLighting = true
  scene.globe.depthTestAgainstTerrain = false
  scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(0.35, -0.7, -0.6)
  })

  buildMountain()
  buildReservoirs()
  buildDam()
  buildWaterways()
  buildBuildings()
  buildFlowMarkers()
  buildLabels()
  startFlow()

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      SITE_COORDS.cameraHome.lon,
      SITE_COORDS.cameraHome.lat,
      SITE_COORDS.cameraHome.height
    ),
    orientation: {
      heading: Cesium.Math.toRadians(335),
      pitch: Cesium.Math.toRadians(-26),
      roll: 0
    },
    duration: 2.5
  })
})


// 山体: 叠层挤出多边形, 形成云台山massif, 上水库坐落山顶
function buildMountain() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('mountain')
  viewer.dataSources.add(ds)
  // 中心介于上库与厂房之间
  const cLon = U.lon
  const cLat = (U.lat + P.lat) / 2 + 0.001
  const tiers = [
    { r: 1500, h: 120, c: '#3a4232' },
    { r: 1150, h: 260, c: '#444c38' },
    { r: 820, h: 380, c: '#4c543e' },
    { r: 560, h: 470, c: '#545c44' },
    { r: 360, h: 512, c: '#5c6448' }
  ]
  tiers.forEach((t) => {
    ds.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(circleDegrees(cLon, cLat, t.r, 56))
        ),
        height: 0,
        extrudedHeight: t.h,
        material: Cesium.Color.fromCssColorString(t.c),
        outline: false,
        shadows: Cesium.ShadowMode.ENABLED
      }
    })
  })
}

// 水库: 三维水体(挤出多边形), 顶面随实时水位升降; 外加库岸挡墙
function buildReservoirs() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('reservoirs')
  viewer.dataSources.add(ds)

  const make = (
    lon: number, lat: number, r: number, bedH: number,
    levelFn: () => number, color: string, rim: string
  ) => {
    const ring = circleDegrees(lon, lat, r, 52)
    // 库盆挡墙(库岸)
    ds.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(ring)),
        height: bedH - 6,
        extrudedHeight: levelFn() + 8,
        material: Cesium.Color.fromCssColorString('#2b3340').withAlpha(0.0),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(rim).withAlpha(0.85)
      }
    })
    // 三维水体
    ds.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(circleDegrees(lon, lat, r - 12, 52))
        ),
        height: bedH,
        extrudedHeight: new Cesium.CallbackProperty(() => levelFn(), false),
        material: Cesium.Color.fromCssColorString(color).withAlpha(0.72),
        outline: false
      }
    })
  }

  make(U.lon, U.lat, 300, UPPER_RES.deadLevelM - 18,
    () => plant.upperReservoir.levelM, '#16b6ff', '#9fe8ff')
  make(L.lon, L.lat, 360, LOWER_RES.deadLevelM - 16,
    () => plant.lowerReservoir.levelM, '#1184e0', '#8fc8ff')
}


// 大坝: 上水库下游侧的混凝土面板堆石坝(用 wall + 挤出体)
function buildDam() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('dam')
  viewer.dataSources.add(ds)
  // 坝轴线横跨上库南缘
  const w = 0.0042
  const damLat = U.lat - 0.0028
  const crest = UPPER_RES.normalLevelM + 12
  const base = UPPER_RES.deadLevelM - 60
  ds.entities.add({
    name: '大坝',
    wall: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        U.lon - w, damLat, crest,
        U.lon - w / 2, damLat - 0.0004, crest,
        U.lon + w / 2, damLat - 0.0004, crest,
        U.lon + w, damLat, crest
      ]),
      minimumHeights: [base, base - 20, base - 20, base],
      material: Cesium.Color.fromCssColorString('#8a8f98'),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#c8ccd2')
    }
  })
}

// 输水管路: 真三维圆管(polylineVolume), 引水+尾水
function buildWaterways() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('waterways')
  viewer.dataSources.add(ds)
  const pipeShape: Cesium.Cartesian2[] = []
  const rad = 9
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    pipeShape.push(new Cesium.Cartesian2(Math.cos(a) * rad, Math.sin(a) * rad))
  }
  ds.entities.add({
    name: '引水系统',
    polylineVolume: {
      positions: headPath,
      shape: pipeShape,
      material: Cesium.Color.fromCssColorString('#5a6478'),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#7f8aa0')
    }
  })
  ds.entities.add({
    name: '尾水系统',
    polylineVolume: {
      positions: tailPath,
      shape: pipeShape,
      material: Cesium.Color.fromCssColorString('#4a5468'),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#6f7a90')
    }
  })
}


// 建筑: 地下厂房(半透明洞室+地面副厂房) + 升压站 + 输电铁塔/线
function buildBuildings() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('buildings')
  viewer.dataSources.add(ds)

  // 地下厂房洞室(半透明, 体现"地下")
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(P.lon, P.lat, P.height - 30),
    box: {
      dimensions: new Cesium.Cartesian3(180, 70, 110),
      material: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.18),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#00d4ff').withAlpha(0.7)
    }
  })
  // 地面副厂房
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(P.lon + 0.0016, P.lat - 0.0006, P.height + 16),
    box: {
      dimensions: new Cesium.Cartesian3(70, 40, 32),
      material: Cesium.Color.fromCssColorString('#c8d0dc'),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#ffffff')
    }
  })

  // 升压站平台 + 主变箱体
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(SW.lon, SW.lat, SW.height + 4),
    box: {
      dimensions: new Cesium.Cartesian3(120, 80, 8),
      material: Cesium.Color.fromCssColorString('#3a4250')
    }
  })
  for (let i = 0; i < 4; i++) {
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        SW.lon - 0.0004 + i * 0.00027, SW.lat, SW.height + 16
      ),
      box: {
        dimensions: new Cesium.Cartesian3(16, 22, 24),
        material: Cesium.Color.fromCssColorString('#9aa4b2'),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#cfd6df')
      }
    })
  }

  // 输电铁塔 + 高压线
  const towerLats = [SW.lat - 0.0009, SW.lat - 0.0024, SW.lat - 0.004]
  const towerH = 70
  towerLats.forEach((tl) => {
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(SW.lon, tl, SW.height + towerH / 2),
      box: {
        dimensions: new Cesium.Cartesian3(10, 10, towerH),
        material: Cesium.Color.fromCssColorString('#6a7585'),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#aab4c2')
      }
    })
  })
  const lineLats = [SW.lat, ...towerLats]
  for (let k = 0; k < lineLats.length - 1; k++) {
    ds.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          SW.lon, lineLats[k], SW.height + towerH,
          SW.lon, lineLats[k + 1], SW.height + towerH
        ]),
        width: 1.5,
        material: Cesium.Color.fromCssColorString('#a78bfa').withAlpha(0.8)
      }
    })
  }
}


// 水流标记: 沿"上库→厂房→下库"管路移动的发光球, 直观体现三维水流与方向
function buildFlowMarkers() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('flow')
  viewer.dataSources.add(ds)
  const fullPath = [...headPath, ...tailPath]
  const N = 9
  for (let i = 0; i < N; i++) {
    const base = i / N
    ds.entities.add({
      position: new Cesium.CallbackPositionProperty(() => {
        const dir = plant.globalMode === 'pumping' ? -1 : 1
        let t = (base + flowPhase * 0.06 * dir) % 1
        if (t < 0) t += 1
        return lerpAlong(fullPath, t)
      }, false),
      point: {
        pixelSize: 11,
        color: new Cesium.CallbackProperty(() => {
          const m = plant.globalMode
          const c = m === 'generating' ? '#00e0ff' : m === 'pumping' ? '#ffae3a' : '#33506e'
          return Cesium.Color.fromCssColorString(c).withAlpha(m === 'idle' ? 0.0 : 0.95)
        }, false),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
        outlineWidth: 1
      }
    })
  }
}

function labelEntity(
  ds: Cesium.CustomDataSource, lon: number, lat: number, h: number,
  text: string, color: string
) {
  ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, h),
    point: { pixelSize: 8, color: Cesium.Color.fromCssColorString(color) },
    label: {
      text,
      font: 'bold 13px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString('#02060c'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  })
}

function buildLabels() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('labels')
  viewer.dataSources.add(ds)
  labelEntity(ds, U.lon, U.lat, UPPER_RES.normalLevelM + 30, '上水库 · 云台山顶', '#00ff88')
  labelEntity(ds, L.lon, L.lat, LOWER_RES.normalLevelM + 24, '下水库', '#19a0ff')
  labelEntity(ds, P.lon + 0.0016, P.lat - 0.0006, P.height + 44, `地下厂房 ${PLANT_INFO.totalCapacityMW}MW`, '#ff9d00')
  labelEntity(ds, SW.lon, SW.lat, SW.height + 30, '升压站', '#a78bfa')
}

function startFlow() {
  if (!viewer) return
  viewer.scene.preRender.addEventListener(() => {
    const speed = plant.globalMode === 'idle' ? 0.04 : 0.18 * (0.5 + plant.simSpeed * 0.05)
    flowPhase += speed
  })
}

onBeforeUnmount(() => {
  viewer?.destroy()
  viewer = null
})
</script>


<template>
  <div ref="container" class="cesium-container">
    <div class="cesium-note">
      📍 云台山 · 宿城街道 ｜ 三维示意场景（山体/水库/管路/厂房为模型化表达）<br />
      底图：OpenStreetMap ｜ 配置 Cesium Ion token 后可叠加真实卫星影像与地形
    </div>
  </div>
</template>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  position: relative;
}
.cesium-note {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 5;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  background: rgba(8, 18, 32, 0.7);
  border: 1px solid var(--border-line);
  padding: 5px 10px;
  border-radius: 4px;
  pointer-events: none;
}
</style>
