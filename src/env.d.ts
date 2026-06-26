/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const locale: any
  export default locale
}

declare module '@mkkellogg/gaussian-splats-3d' {
  export const Viewer: any
  export const DropInViewer: any
  export const SceneFormat: any
  const _default: any
  export default _default
}

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string
  readonly VITE_TIANDITU_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
