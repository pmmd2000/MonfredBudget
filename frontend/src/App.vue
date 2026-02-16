<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast';
import ReloadPrompt from './components/ReloadPrompt.vue'
</script>

<template>
  <Toast />
  <ReloadPrompt />
  <div class="min-h-screen bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-0 font-sans">
    <RouterView />
  </div>
</template>
