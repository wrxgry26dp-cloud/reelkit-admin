// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'ReelKit Admin',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },
  supabase: {
    redirect: false,
  },
  devServer: {
    port: 3001,
  },
})
