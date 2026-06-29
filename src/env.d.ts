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

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string
  readonly VITE_TIANDITU_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
