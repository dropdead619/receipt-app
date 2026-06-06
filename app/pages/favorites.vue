<script setup lang="ts">
import type { Recipe } from '#shared/types'

const { ids, load } = useFavorites()
const { byIds } = useRecipes()

await load(true)

const { data: recipes, refresh } = await useAsyncData<Recipe[]>(
  'favorite-recipes',
  () => byIds([...ids.value]),
  { default: () => [] },
)

// Перезагружаем при изменении набора избранного
watch(ids, () => refresh())

const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return recipes.value ?? []
  return (recipes.value ?? []).filter((r) => r.title.toLowerCase().includes(q))
})
</script>

<template>
  <div class="px-4 pt-safe">
    <header class="pt-4">
      <h1 class="text-2xl font-extrabold text-sand-900">Избранное</h1>
      <p class="text-sm text-sand-500">{{ recipes?.length ?? 0 }} рецептов</p>
    </header>

    <div v-if="recipes && recipes.length" class="relative mt-4">
      <AppIcon
        name="search"
        class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-sand-400"
      />
      <input v-model="search" type="search" placeholder="Поиск в избранном…" class="input pl-10" />
    </div>

    <div v-if="filtered.length" class="mt-4 grid grid-cols-2 gap-3">
      <RecipeCard v-for="r in filtered" :key="r.id" :recipe="r" />
    </div>

    <EmptyState
      v-else
      icon="heart"
      title="Пока пусто"
      text="Добавляйте рецепты в избранное — они появятся здесь."
    />
  </div>
</template>
