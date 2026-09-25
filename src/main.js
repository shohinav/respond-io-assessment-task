import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import './style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import 'vue-sonner/style.css'
import '@vuepic/vue-datepicker/dist/main.css'

const queryClientConfig = {
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            networkMode: 'always',
            staleTime: Infinity,
            gcTime: 60 * 60 * 1000,
        },
    },
}

createApp(App)
    .use(createPinia())
    .use(router)
    .use(VueQueryPlugin, { queryClientConfig })
    .mount('#app')
