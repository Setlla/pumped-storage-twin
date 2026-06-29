import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import AdminLayout from '@/views/admin/AdminLayout.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'screen', component: DashboardView, meta: { title: '数字孪生大屏' } },
    {
      path: '/admin',
      component: AdminLayout,
      redirect: '/admin/master',
      children: [
        { path: 'master', name: 'admin-master', component: () => import('@/components/construction/MasterDataPanel.vue'), meta: { title: '基础资料管理', group: '数据管理' } },
        { path: 'import', name: 'admin-import', component: () => import('@/views/admin/ImportPage.vue'), meta: { title: '台账数据导入', group: '数据管理' } },
        { path: 'backend', name: 'admin-backend', component: () => import('@/views/admin/BackendPage.vue'), meta: { title: '数据服务连接', group: '数据管理' } },
        { path: 'allocation', name: 'admin-allocation', component: () => import('@/components/construction/AllocationPanel.vue'), meta: { title: '调配方案与参数', group: '业务管理' } },
        { path: 'alert', name: 'admin-alert', component: () => import('@/components/construction/AlertCenter.vue'), meta: { title: '预警阈值与处置', group: '业务管理' } },
        { path: 'transport', name: 'admin-transport', component: () => import('@/components/construction/TransportPanel.vue'), meta: { title: '运输记录管理', group: '业务管理' } },
        { path: 'report', name: 'admin-report', component: () => import('@/views/admin/ReportPage.vue'), meta: { title: '报表中心', group: '报表与治理' } },
        { path: 'audit', name: 'admin-audit', component: () => import('@/components/construction/GovernancePanel.vue'), meta: { title: '操作审计与数据治理', group: '报表与治理' } }
      ]
    }
  ]
})

export default router
