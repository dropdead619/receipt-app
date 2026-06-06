<script setup lang="ts">
import type { Recipe } from '#shared/types'

interface Match {
  recipe: Recipe
  total: number
  have: number
  missing: number
  ratio: number
}

const { list: pantryList } = usePantry()
const { load: loadFav } = useFavorites()

const onlyComplete = ref(false)

const { data, pending } = await useAsyncData<Match[]>('cook-matches', async () => {
  const pantry = await pantryList()
  const ids = pantry.map((p) => p.ingredient_id)
  if (!ids.length) return []
  const res = await $fetch<{ recipes: Match[] }>('/api/recipes/by-ingredients', {
    method: 'POST',
    body: { ingredientIds: ids },
  })
  return res.recipes
})

onMounted(() => loadFav())

const filtered = computed(() => {
  const list = data.value ?? []
  return onlyComplete.value ? list.filter((m) => m.missing === 0) : list
})
</script>

<template>
  <div class="px-4 pt-safe">
    <header class="pt-4">
      <h1 class="text-2xl font-extrabold text-sand-900">Что приготовить</h1>
      <p class="text-sm text-sand-500">На основе вашей кладовой</p>
    </header>

    <div class="mt-4 flex gap-2">
      <button class="chip" :class="{ 'chip-active': !onlyComplete }" @click="onlyComplete = false">
        Все варианты
      </button>
      <button class="chip" :class="{ 'chip-active': onlyComplete }" @click="onlyComplete = true">
        Можно приготовить полностью
      </button>
    </div>

    <div v-if="pending" class="mt-4 space-y-3">
      <div v-for="i in 4" :key="i" class="card h-24 animate-pulse bg-sand-100" />
    </div>

    <div v-else-if="filtered.length" class="mt-4 space-y-3">
      <NuxtLink
        v-for="m in filtered"
        :key="m.recipe.id"
        :to="`/recipes/${m.recipe.slug}`"
        class="card flex gap-3 overflow-hidden p-2"
      >
        <div class="size-24 shrink-0 overflow-hidden rounded-xl bg-sand-100">
          <img
            v-if="m.recipe.image_url"
            :src="m.recipe.image_url"
            :alt="m.recipe.title"
            class="size-full object-cover"
          />
          <div v-else class="flex size-full items-center justify-center text-sand-300">
            <AppIcon name="pan" class="size-8" />
          </div>
        </div>
        <div class="min-w-0 flex-1 py-1">
          <h3 class="line-clamp-2 font-bold text-sand-900">{{ m.recipe.title }}</h3>
          <span
            class="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="m.missing === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
          >
            есть {{ m.have }} из {{ m.total }}
            <template v-if="m.missing > 0">· не хватает {{ m.missing }}</template>
          </span>
          <NutritionBadge
            size="sm"
            class="mt-1.5"
            :macros="{ kcal: m.recipe.kcal_per_serving, protein: m.recipe.protein_per_serving, fat: m.recipe.fat_per_serving, carb: m.recipe.carb_per_serving }"
          />
        </div>
      </NuxtLink>
    </div>

    <EmptyState
      v-else
      icon="pan"
      title="Нет подходящих рецептов"
      text="Добавьте больше продуктов в кладовую или сгенерируйте новые рецепты."
    >
      <NuxtLink to="/pantry" class="btn-ghost mt-4">В кладовую</NuxtLink>
    </EmptyState>
  </div>
</template>
