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
    <div class="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-black p-4">
        <Card class="w-full max-w-md shadow-2xl bg-white dark:bg-white text-surface-900 dark:text-black">
            <template #title>
                <div class="text-center text-3xl font-bold mb-2">خوش آمدید</div>
            </template>
            <template #content>
                <form @submit.prevent="handleLogin" class="flex flex-col gap-6 p-4">
                    <div class="flex flex-col gap-2">
                        <label for="username" class="font-semibold">نام کاربری</label>
                        <InputText id="username" v-model="username" class="w-full text-right" dir="rtl" required />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="password" class="font-semibold">رمز عبور</label>
                        <Password id="password" v-model="password" :feedback="false" toggleMask class="w-full" inputClass="w-full text-right" required />
                    </div>
                    <Button type="submit" label="ورود" class="w-full p-button-lg" />
                </form>
            </template>
        </Card>
    </div>
</template>
