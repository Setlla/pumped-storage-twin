/**
 * 3D 高斯泼溅(3DGS)实景数据源配置。
 *
 * ⚠️ 当前为公开示例数据(antimatter15/cakewalk 演示场景),仅用于验证
 * "高斯泼溅 + 多期时间轴" 在本孪生中的渲染管线是否跑通。
 *
 * 正式使用时,替换为项目无人机逐期航飞训练得到的 .splat / .ksplat / .ply,
 * 即可形成真实工地的照片级多期实景。
 */
export interface SplatPeriod {
  id: string
  label: string // 期次标签(将来=航飞日期)
  url: string
  note: string
}

export const SPLAT_PERIODS: SplatPeriod[] = [
  {
    id: 'p1',
    label: '示例·场景A',
    url: 'https://huggingface.co/cakewalk/splat-data/resolve/main/train.splat',
    note: '公开示例(train)。替换为首期无人机成果。'
  },
  {
    id: 'p2',
    label: '示例·场景B',
    url: 'https://huggingface.co/cakewalk/splat-data/resolve/main/nike.splat',
    note: '公开示例(nike)。替换为第二期无人机成果。'
  },
  {
    id: 'p3',
    label: '示例·场景C',
    url: 'https://huggingface.co/cakewalk/splat-data/resolve/main/plush.splat',
    note: '公开示例(plush)。替换为第三期无人机成果。'
  }
]
