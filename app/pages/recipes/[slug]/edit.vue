<script setup lang="ts">
import type { Recipe } from '#shared/types'

const route = useRoute()
const slug = route.params.slug as string

const { bySlug } = useRecipes()
const { data: recipe } = await useAsyncData<Recipe | null>(`recipe-edit-${slug}`, () =>
  bySlug(slug),
)
if (!recipe.value) throw createError({ statusCode: 404, statusMessage: 'Рецепт не найден' })

const saving = ref(false)
const serverError = ref('')

async function onSubmit(body: Record<string, unknown>) {
  if (!recipe.value) return
  serverError.value = ''
  saving.value = true
  try {
    await $fetch<{ id: string; slug: string }>(`/api/recipes/${recipe.value.id}`, {
      method: 'PUT',
      body,
    })
    await navigateTo(`/recipes/${slug}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    serverError.value = err.data?.message || err.message || 'Не удалось сохранить изменения'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="recipe" class="px-4 pt-safe pb-6">
    <header class="flex items-center gap-3 pt-4">
      <button
        class="grid size-10 shrink-0 place-items-center rounded-full bg-sand-100 active:scale-90"
        aria-label="Назад"
        @click="$router.back()"
      >
        <AppIcon name="chevronLeft" class="size-6 text-sand-700" />
      </button>
      <div class="min-w-0">
        <h1 class="truncate text-2xl font-extrabold text-sand-900">Редактирование</h1>
        <p class="truncate text-sm text-sand-500">{{ recipe.title }}</p>
      </div>
    </header>

    <RecipeForm
      :initial="recipe"
      :saving="saving"
      :server-error="serverError"
      submit-label="Сохранить изменения"
      @submit="onSubmit"
    />
  </div>
</template>
