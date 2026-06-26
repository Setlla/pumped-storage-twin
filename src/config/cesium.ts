/**
 * Cesium Ion 访问令牌。
 *
 * 优先读取环境变量 VITE_CESIUM_ION_TOKEN；否则使用此内置令牌（演示用）。
 *
 * ⚠️ 安全提示：此令牌已随公开仓库暴露。建议在 Cesium Ion 后台
 * (https://ion.cesium.com/tokens) 为该 token 限制允许的访问域名，
 * 或在演示结束后轮换/吊销，避免配额被他人占用。
 */
export const CESIUM_ION_TOKEN =
  import.meta.env.VITE_CESIUM_ION_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZWI0Y2Q1OC05ZDg4LTQxYTUtYmVmMC05YzMzZDJmYjcwNjMiLCJpZCI6NDQ5MjYwLCJzdWIiOiJ3aXN0YXJpYSIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJ3IiwiaWF0IjoxNzgyNDU1MjgzfQ.OB_O_tfdr8MYCc6qZf1kd5OdDof-Hbpvsw7xoosBoIk'

/** 是否具备可用的 Ion 令牌 */
export const HAS_ION = CESIUM_ION_TOKEN.length > 60
