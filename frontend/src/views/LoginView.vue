<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Card from 'primevue/card'

const username = ref('')
const password = ref('')
const auth = useAuthStore()

const handleLogin = async () => {
    try {
        await auth.login(username.value, password.value)
    } catch (e) {
        alert('Login failed')
    }
}
</script>

<template>
    <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <Card class="w-full max-w-md shadow-2xl backdrop-blur-md bg-white/90 dark:bg-surface-800/90">
            <template #title>
                <div class="text-center text-3xl font-bold mb-2">Welcome Back</div>
            </template>
            <template #content>
                <form @submit.prevent="handleLogin" class="flex flex-col gap-6 p-4">
                    <div class="flex flex-col gap-2">
                        <label for="username" class="font-semibold">Username</label>
                        <InputText id="username" v-model="username" class="w-full" required />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="password" class="font-semibold">Password</label>
                        <Password id="password" v-model="password" :feedback="false" toggleMask class="w-full" inputClass="w-full" required />
                    </div>
                    <Button type="submit" label="Login" class="w-full p-button-lg" />
                    <div class="text-center mt-2">
                        <router-link to="/register" class="text-primary hover:underline">Create an account</router-link>
                    </div>
                </form>
            </template>
        </Card>
    </div>
</template>
