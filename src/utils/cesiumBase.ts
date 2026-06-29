/**
 * Cesium 底图统一配置 — 优先天地图(国产/信创合规),其次 Cesium Ion 影像,最后 OpenStreetMap 兜底。
 *
 * 天地图需在 https://console.tianditu.gov.cn/ 注册免费 key,
 * 通过环境变量 VITE_TIANDITU_TOKEN 注入。
 */
import * as Cesium from 'cesium'
import { HAS_ION } from '@/config/cesium'

export const TIANDITU_TOKEN = (import.meta.env.VITE_TIANDITU_TOKEN as string) || ''
export const HAS_TDT = TIANDITU_TOKEN.length > 10

// 天地图 WMTS 图层(球面墨卡托 w):img_w 影像 / cia_w 影像注记 / vec_w 矢量 / cva_w 矢量注记
function tdtLayer(type: 'img_w' | 'cia_w'): Cesium.ImageryLayer {
  const layer = type.split('_')[0]
  return new Cesium.ImageryLayer(
    new Cesium.WebMapTileServiceImageryProvider({
      url:
        `https://t{s}.tianditu.gov.cn/${type}/wmts?service=WMTS&request=GetTile&version=1.0.0` +
        `&LAYER=${layer}&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}` +
        `&style=default&format=tiles&tk=${TIANDITU_TOKEN}`,
      layer,
      style: 'default',
      format: 'tiles',
      tileMatrixSetID: 'w',
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      maximumLevel: 18,
      credit: new Cesium.Credit('天地图 TianDiTu')
    })
  )
}

/** 当前底图来源(用于界面标注) */
export function basemapName(): string {
  if (HAS_TDT) return '天地图(国产)'
  if (HAS_ION) return 'Cesium Ion 影像'
  return 'OpenStreetMap'
}

/** 为 viewer 应用底图图层 */
export function applyBasemap(viewer: Cesium.Viewer) {
  const layers = viewer.scene.imageryLayers
  layers.removeAll()
  if (HAS_TDT) {
    layers.add(tdtLayer('img_w')) // 影像底图
    layers.add(tdtLayer('cia_w')) // 影像注记
  } else if (HAS_ION) {
    try {
      layers.add(Cesium.ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(2), undefined))
    } catch { /* ignore */ }
  } else {
    layers.add(new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })))
  }
}
