import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import router from '../router'

const API_URL = '/api' // Relative path for production

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token') || '')
    const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

    const isAuthenticated = computed(() => !!token.value)

    function setAuth(newToken: string, newUser: any) {
        token.value = newToken
        user.value = newUser
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(newUser))
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    }

    function logout() {
        token.value = ''
        user.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        delete axios.defaults.headers.common['Authorization']
        router.push('/login')
    }

    async function login(username: string, password: string) {
        const { data } = await axios.post(`${API_URL}/auth/login`, { username, password })
        setAuth(data.token, data.user)
        router.push('/')
    }

    // Init interceptor
    if (token.value) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    }

    // Intercept 401 responses to redirect to login
    axios.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response && error.response.status === 401) {
                // Don't redirect if we're already on the login page or this IS the login request
                const isLoginRequest = error.config?.url?.includes('/auth/login')
                if (!isLoginRequest) {
                    logout()
                }
            }
            return Promise.reject(error)
        }
    )

    return { token, user, isAuthenticated, login, logout }
})
