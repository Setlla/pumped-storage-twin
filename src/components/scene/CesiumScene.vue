<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as Cesium from 'cesium'
import { usePlantStore } from '@/stores/plant'
import { SITE_COORDS, PLANT_INFO } from '@/data/plantConfig'

const container = ref<HTMLDivElement | null>(null)
const plant = usePlantStore()
let viewer: Cesium.Viewer | null = null
let upperWater: Cesium.Entity | null = null
let lowerWater: Cesium.Entity | null = null
let headTunnel: Cesium.Entity | null = null
let tailTunnel: Cesium.Entity | null = null
let flowPhase = 0

onMounted(async () => {
  if (!container.value) return

  // 仅当提供了真实 Ion token(长 JWT)时才启用 Ion 的世界地形/影像;
  // 否则降级为 OpenStreetMap 影像 + 椭球地形, 保证无 token 也能开箱运行.
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
    // 无 token: 用开放街图瓦片做底图, 默认椭球地形(不依赖 Ion)
    viewerOptions.baseLayer = new Cesium.ImageryLayer(
      new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      })
    )
  }

  viewer = new Cesium.Viewer(container.value, viewerOptions)

  // 暗色大气
  const sky = viewer.scene.skyAtmosphere
  if (sky) {
    sky.hueShift = -0.02
    sky.saturationShift = -0.1
    sky.brightnessShift = -0.2
  }
  viewer.scene.fog.density = 0.0005
  viewer.scene.globe.enableLighting = true

  // 飞到电站位置
  const home = SITE_COORDS.cameraHome
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(home.lon, home.lat, home.height),
    orientation: {
      heading: Cesium.Math.toRadians(15),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    },
    duration: 2
  })

  addMarkers()
  addWaterSurfaces()
  startFlowAnimation()
})

function addMarkers() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('plant-markers')
  viewer.dataSources.add(ds)

  // 上水库
  ds.entities.add({
    name: '上水库',
    position: Cesium.Cartesian3.fromDegrees(
      SITE_COORDS.upperReservoir.lon,
      SITE_COORDS.upperReservoir.lat,
      SITE_COORDS.upperReservoir.height
    ),
    point: {
      pixelSize: 16,
      color: Cesium.Color.fromCssColorString('#00ff88'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: '上水库 (云台山顶)',
      font: '13px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20)
    }
  })

  // 下水库
  ds.entities.add({
    name: '下水库',
    position: Cesium.Cartesian3.fromDegrees(
      SITE_COORDS.lowerReservoir.lon,
      SITE_COORDS.lowerReservoir.lat,
      SITE_COORDS.lowerReservoir.height
    ),
    point: {
      pixelSize: 16,
      color: Cesium.Color.fromCssColorString('#0099ff'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: '下水库',
      font: '13px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20)
    }
  })

  // 地下厂房
  ds.entities.add({
    name: '地下厂房',
    position: Cesium.Cartesian3.fromDegrees(
      SITE_COORDS.powerhouse.lon,
      SITE_COORDS.powerhouse.lat,
      SITE_COORDS.powerhouse.height + 50
    ),
    point: {
      pixelSize: 14,
      color: Cesium.Color.fromCssColorString('#ff9d00'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: `地下厂房 ${PLANT_INFO.totalCapacityMW}MW`,
      font: '12px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -18)
    }
  })

  // 升压站
  ds.entities.add({
    name: '升压站',
    position: Cesium.Cartesian3.fromDegrees(
      SITE_COORDS.switchyard.lon,
      SITE_COORDS.switchyard.lat,
      SITE_COORDS.switchyard.height + 30
    ),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString('#a78bfa'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1.5
    },
    label: {
      text: '升压站',
      font: '11px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -16)
    }
  })

  // 引水隧洞示意线
  headTunnel = ds.entities.add({
    name: '引水隧洞',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        SITE_COORDS.upperReservoir.lon,
        SITE_COORDS.upperReservoir.lat,
        SITE_COORDS.upperReservoir.height,
        SITE_COORDS.powerhouse.lon,
        SITE_COORDS.powerhouse.lat,
        SITE_COORDS.powerhouse.height + 50
      ]),
      width: 3,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: Cesium.Color.fromCssColorString('#00d4ff')
      }),
      clampToGround: false
    }
  })

  // 尾水隧洞示意线
  tailTunnel = ds.entities.add({
    name: '尾水隧洞',
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        SITE_COORDS.powerhouse.lon,
        SITE_COORDS.powerhouse.lat,
        SITE_COORDS.powerhouse.height + 50,
        SITE_COORDS.lowerReservoir.lon,
        SITE_COORDS.lowerReservoir.lat,
        SITE_COORDS.lowerReservoir.height
      ]),
      width: 3,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: Cesium.Color.fromCssColorString('#0099ff')
      }),
      clampToGround: false
    }
  })
}

function addWaterSurfaces() {
  if (!viewer) return
  const ds = new Cesium.CustomDataSource('water')
  viewer.dataSources.add(ds)

  // 上水库水面 (椭圆,高度随水位用 CallbackProperty)
  upperWater = ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      SITE_COORDS.upperReservoir.lon,
      SITE_COORDS.upperReservoir.lat,
      0
    ),
    ellipse: {
      semiMajorAxis: 420,
      semiMinorAxis: 300,
      height: new Cesium.CallbackProperty(
        () => plant.upperReservoir.levelM,
        false
      ),
      material: Cesium.Color.fromCssColorString('#0aa0ff').withAlpha(0.55),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#7fdfff').withAlpha(0.7)
    }
  })

  // 下水库水面
  lowerWater = ds.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      SITE_COORDS.lowerReservoir.lon,
      SITE_COORDS.lowerReservoir.lat,
      0
    ),
    ellipse: {
      semiMajorAxis: 480,
      semiMinorAxis: 340,
      height: new Cesium.CallbackProperty(
        () => plant.lowerReservoir.levelM,
        false
      ),
      material: Cesium.Color.fromCssColorString('#0a78dd').withAlpha(0.55),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#7fbfff').withAlpha(0.7)
    }
  })
}

function startFlowAnimation() {
  if (!viewer) return
  // 用 CallbackProperty 让隧洞辉光强度脉动,颜色随工况
  const headColor = new Cesium.CallbackProperty(() => {
    const mode = plant.globalMode
    const base =
      mode === 'generating' ? '#00e0ff' : mode === 'pumping' ? '#ff9d00' : '#2a5a8a'
    const pulse = 0.45 + 0.35 * Math.abs(Math.sin(flowPhase))
    return Cesium.Color.fromCssColorString(base).withAlpha(
      mode === 'idle' ? 0.4 : pulse
    )
  }, false)
  const tailColor = new Cesium.CallbackProperty(() => {
    const mode = plant.globalMode
    const base =
      mode === 'generating' ? '#0099ff' : mode === 'pumping' ? '#ffb84d' : '#2a5a8a'
    const pulse = 0.45 + 0.35 * Math.abs(Math.sin(flowPhase + 1.5))
    return Cesium.Color.fromCssColorString(base).withAlpha(
      mode === 'idle' ? 0.4 : pulse
    )
  }, false)

  if (headTunnel?.polyline) {
    headTunnel.polyline.material = new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.35,
      color: headColor
    })
  }
  if (tailTunnel?.polyline) {
    tailTunnel.polyline.material = new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.35,
      color: tailColor
    })
  }

  // 推进相位
  viewer.scene.preRender.addEventListener(() => {
    const speed = plant.globalMode === 'idle' ? 0.02 : 0.12
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
      📍 云台山 · 宿城街道 ｜ 底图：OpenStreetMap（配置 Cesium Ion token 后可启用卫星影像+真实地形）
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
  color: var(--text-secondary);
  background: rgba(8, 18, 32, 0.7);
  border: 1px solid var(--border-line);
  padding: 5px 10px;
  border-radius: 4px;
  pointer-events: none;
}
</style>
