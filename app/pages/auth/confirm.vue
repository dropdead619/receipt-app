<script setup lang="ts">
definePageMeta({ layout: 'auth' })

// Колбэк OAuth/подтверждения почты. @nuxtjs/supabase обменивает код на сессию,
// после чего user становится доступен — уводим в приложение.
const user = useSupabaseUser()

watchEffect(() => {
  if (user.value) {
    const redirect = useCookie('sb-redirect-path')
    const to = redirect.value || '/'
    redirect.value = null
    navigateTo(to, { replace: true })
  }
})
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-3 text-sand-500">
    <div class="size-8 animate-spin rounded-full border-2 border-sand-300 border-t-brand-500" />
    <p class="text-sm">Входим…</p>
  </div>
</template>
