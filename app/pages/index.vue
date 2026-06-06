<script setup lang="ts">
import {
  CATEGORY_LABELS,
  CUISINE_LABELS,
  type Category,
  type Cuisine,
  type Recipe,
} from '#shared/types'

const { list } = useRecipes()
const { load: loadFavorites } = useFavorites()

const search = ref('')
const cuisine = ref<Cuisine | null>(null)
const category = ref<Category | null>(null)

const cuisines = Object.entries(CUISINE_LABELS) as [Cuisine, string][]
const categories = Object.entries(CATEGORY_LABELS) as [Category, string][]

const { data: recipes, pending, refresh } = await useAsyncData<Recipe[]>(
  'home-recipes',
  () =>
    list({
      cuisine: cuisine.value,
      category: category.value,
      search: search.value.trim(),
    }),
  { watch: [cuisine, category], default: () => [] },
)

watchDebounced(search, () => refresh(), { debounce: 350 })

onMounted(() => loadFavorites())

function toggleCuisine(c: Cuisine) {
  cuisine.value = cuisine.value === c ? null : c
}
function toggleCategory(c: Category) {
  category.value = category.value === c ? null : c
}
</script>

<template>
  <div>
    <header class="px-4 pt-safe">
      <div class="pt-4">
        <h1 class="text-2xl font-extrabold text-sand-900">Рецепты</h1>
        <p class="text-sm text-sand-500">Под ваш каллораж на двоих</p>
      </div>

      <div class="relative mt-4">
        <AppIcon
          name="search"
          class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-sand-400"
        />
        <input
          v-model="search"
          type="search"
          placeholder="Поиск рецептов…"
          class="input pl-10"
        />
      </div>
    </header>

    <!-- Кухни -->
    <section class="mt-4">
      <div class="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          v-for="[key, label] in cuisines"
          :key="key"
          class="chip"
          :class="{ 'chip-active': cuisine === key }"
          @click="toggleCuisine(key)"
        >
          {{ label }}
        </button>
      </div>
    </section>

    <!-- Категории -->
    <section class="mt-2">
      <div class="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          v-for="[key, label] in categories"
          :key="key"
          class="chip"
          :class="{ 'chip-active': category === key }"
          @click="toggleCategory(key)"
        >
          {{ label }}
        </button>
      </div>
    </section>

    <!-- Результаты -->
    <section class="mt-4 px-4">
      <div v-if="pending" class="grid grid-cols-2 gap-3">
        <div v-for="i in 6" :key="i" class="card aspect-[4/5] animate-pulse bg-sand-100" />
      </div>

      <div v-else-if="recipes && recipes.length" class="grid grid-cols-2 gap-3">
        <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
      </div>

      <EmptyState
        v-else
        icon="search"
        title="Ничего не найдено"
        text="Попробуйте изменить фильтры или сгенерировать новые рецепты."
      />
    </section>
  </div>
</template>
