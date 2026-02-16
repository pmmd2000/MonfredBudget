<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
        // Check for updates every 60 seconds
        if (registration) {
            setInterval(() => {
                registration.update()
            }, 60 * 1000)
        }
    },
    onRegisterError(error: unknown) {
        console.error('SW registration error:', error)
    }
})

const close = () => {
    needRefresh.value = false
}
</script>

<template>
    <div v-if="needRefresh" class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-blue-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3">
        <span class="text-sm font-medium">نسخه جدید موجود است!</span>
        <div class="flex gap-2">
            <button @click="updateServiceWorker()" class="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
                بروزرسانی
            </button>
            <button @click="close()" class="text-white/80 hover:text-white px-2 transition-colors">
                <i class="pi pi-times"></i>
            </button>
        </div>
    </div>
</template>
