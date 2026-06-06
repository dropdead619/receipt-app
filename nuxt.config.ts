// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase', '@pinia/nuxt', '@vueuse/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  supabase: {
    // Куда редиректить неавторизованных
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/confirm',
      include: undefined,
      exclude: ['/auth/*', '/api/*'],
      saveRedirectToCookie: true,
    },
  },

  // ANTHROPIC_API_KEY / USDA_API_KEY НЕ кладём в runtimeConfig, иначе их значения
  // запекаются в бандл на этапе сборки. Серверный код читает их через process.env
  // в рантайме (см. server/utils/anthropic.ts, nutrition.ts).

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#E8633A' },
        // iOS PWA: установка на домашний экран
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Рецепты' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
        },
        // PWA-манифест + иконка для домашнего экрана iOS
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      title: 'Рецепты под ваш каллораж',
    },
  },
})
