import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('../views/HomeView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/LoginView.vue')
        },

        {
            path: '/history/:id',
            name: 'history',
            component: () => import('../views/TransactionHistoryView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/global-history',
            name: 'global-history',
            component: () => import('../views/GlobalHistoryView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/export',
            name: 'export',
            component: () => import('../views/ExportView.vue'),
            meta: { requiresAuth: true }
        }
    ]
})

router.beforeEach((to, _from, next) => {
    const auth = useAuthStore()
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        next('/login')
    } else {
        next()
    }
})

export default router
