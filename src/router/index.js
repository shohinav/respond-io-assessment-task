import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'flow',
            component: () => import('@/pages/FlowPage.vue'),
        },
    ],
})

export default router
