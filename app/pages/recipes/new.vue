<script setup lang="ts">
const saving = ref(false)
const serverError = ref('')

async function onSubmit(body: Record<string, unknown>) {
  serverError.value = ''
  saving.value = true
  try {
    const { slug } = await $fetch<{ id: string; slug: string }>('/api/recipes/create', {
      method: 'POST',
      body,
    })
    await navigateTo(`/recipes/${slug}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    serverError.value = err.data?.message || err.message || 'Не удалось сохранить рецепт'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="px-4 pt-safe pb-6">
    <header class="flex items-center gap-3 pt-4">
      <button
        class="grid size-10 shrink-0 place-items-center rounded-full bg-sand-100 active:scale-90"
        aria-label="Назад"
        @click="$router.back()"
      >
        <AppIcon name="chevronLeft" class="size-6 text-sand-700" />
      </button>
      <div>
        <h1 class="text-2xl font-extrabold text-sand-900">Новый рецепт</h1>
        <p class="text-sm text-sand-500">Поля со звёздочкой обязательны</p>
      </div>
    </header>

    <RecipeForm :saving="saving" :server-error="serverError" @submit="onSubmit" />
  </div>
</template>
