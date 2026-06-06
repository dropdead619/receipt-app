<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const notice = ref('')

// Уже вошёл — уводим внутрь
watchEffect(() => {
  if (user.value) navigateTo('/', { replace: true })
})

async function submit() {
  error.value = ''
  notice.value = ''
  loading.value = true
  try {
    if (mode.value === 'signin') {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
      if (e) throw e
    } else {
      const { error: e } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })
      if (e) throw e
      notice.value = 'Проверьте почту — мы отправили ссылку для подтверждения.'
    }
  } catch (e: unknown) {
    error.value = (e as Error).message ?? 'Что-то пошло не так'
  } finally {
    loading.value = false
  }
}

async function google() {
  error.value = ''
  const { error: e } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/confirm` },
  })
  if (e) error.value = e.message
}
</script>

<template>
  <div class="relative flex min-h-dvh flex-col">
    <!-- Фон -->
    <div class="absolute inset-0">
      <img
        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200"
        alt=""
        class="size-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85" />
    </div>

    <div class="relative z-10 flex flex-1 flex-col justify-end p-6 pb-10">
      <div class="mb-8 text-white">
        <div class="mb-3 inline-grid size-12 place-items-center rounded-2xl bg-brand-500">
          <AppIcon name="pan" class="size-7 text-white" />
        </div>
        <h1 class="text-3xl font-extrabold leading-tight">
          Рецепты под ваш<br />каллораж
        </h1>
        <p class="mt-2 text-white/70">Адаптация КБЖУ на двоих, меню недели и закуп.</p>
      </div>

      <div class="card space-y-3 p-5">
        <div class="grid grid-cols-2 gap-1 rounded-xl bg-sand-100 p-1">
          <button
            class="rounded-lg py-2 text-sm font-semibold transition"
            :class="mode === 'signin' ? 'bg-white text-sand-900 shadow-sm' : 'text-sand-500'"
            @click="mode = 'signin'"
          >
            Вход
          </button>
          <button
            class="rounded-lg py-2 text-sm font-semibold transition"
            :class="mode === 'signup' ? 'bg-white text-sand-900 shadow-sm' : 'text-sand-500'"
            @click="mode = 'signup'"
          >
            Регистрация
          </button>
        </div>

        <form class="space-y-3" @submit.prevent="submit">
          <input v-model="email" type="email" required placeholder="Email" class="input" />
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            placeholder="Пароль"
            class="input"
          />

          <p v-if="error" class="text-sm font-medium text-red-600">{{ error }}</p>
          <p v-if="notice" class="text-sm font-medium text-emerald-600">{{ notice }}</p>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <span v-if="loading">Подождите…</span>
            <span v-else>{{ mode === 'signin' ? 'Войти' : 'Создать аккаунт' }}</span>
          </button>
        </form>

        <div class="flex items-center gap-3 text-xs text-sand-400">
          <span class="h-px flex-1 bg-sand-200" /> или <span class="h-px flex-1 bg-sand-200" />
        </div>

        <button class="btn-ghost w-full" @click="google">
          <AppIcon name="google" class="size-5" />
          Войти через Google
        </button>
      </div>
    </div>
  </div>
</template>
