import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import App from './App.vue'
import router from './router'

import './style.css'
import 'primeicons/primeicons.css'
import Vue3PersianDatetimePicker from 'vue3-persian-datetime-picker'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vue3PersianDatetimePicker, {
    name: 'PersianDatePicker',
    props: {
        format: 'x', // unix timestamp
        displayFormat: 'jYYYY/jMM/jDD',
        editable: false,
        inputClass: 'p-inputtext p-component w-full text-right',
        color: '#3b82f6',
    }
})
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.dark',
        }
    }
})
app.use(ToastService)
app.use(ConfirmationService)

app.mount('#app')
