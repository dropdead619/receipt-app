<script setup lang="ts">
import type { Recipe, RecipeIngredient } from '#shared/types'

const { list, bySlug } = useRecipes()
const { add: addToShopping } = useShoppingList()

const { data: recipes } = await useAsyncData<Recipe[]>(
  'recommended',
  () => list({}),
  { default: () => [] },
)

const expanded = ref<string | null>(null)
const ingredientCache = ref<Record<string, RecipeIngredient[]>>({})
const loadingId = ref<string | null>(null)

// Выбранные «нет в наличии» → ingredient_id -> {grams, recipeId}
const selected = ref<Map<string, { grams: number; recipeId: string }>>(new Map())
const selectedCount = computed(() => selected.value.size)

async function toggleExpand(recipe: Recipe) {
  if (expanded.value === recipe.id) {
    expanded.value = null
    return
  }
  expanded.value = recipe.id
  if (!ingredientCache.value[recipe.id]) {
    loadingId.value = recipe.id
    const full = await bySlug(recipe.slug)
    ingredientCache.value[recipe.id] = full?.ingredients ?? []
    loadingId.value = null
  }
}

function toggleIngredient(recipeId: string, ing: RecipeIngredient) {
  const next = new Map(selected.value)
  if (next.has(ing.ingredient_id)) next.delete(ing.ingredient_id)
  else next.set(ing.ingredient_id, { grams: ing.grams, recipeId })
  selected.value = next
}

const submitting = ref(false)
async function buildList() {
  submitting.value = true
  try {
    const items = [...selected.value.entries()].map(([ingredient_id, v]) => ({
      ingredient_id,
      grams: v.grams,
    }))
    await addToShopping(items)
    await navigateTo('/shopping-list')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="px-4 pt-safe pb-4">
    <header class="pt-4">
      <h1 class="text-2xl font-extrabold text-sand-900">Рекомендуем</h1>
      <p class="text-sm text-sand-500">Отметьте, чего нет — соберём список закупа</p>
    </header>

    <div v-if="recipes && recipes.length" class="mt-4 space-y-3">
      <div v-for="r in recipes" :key="r.id" class="card overflow-hidden">
        <button class="flex w-full items-center gap-3 p-2 text-left" @click="toggleExpand(r)">
          <div class="size-20 shrink-0 overflow-hidden rounded-xl bg-sand-100">
            <img
              v-if="r.image_url"
              :src="r.image_url"
              :alt="r.title"
              class="size-full object-cover"
            />
            <div v-else class="flex size-full items-center justify-center text-sand-300">
              <AppIcon name="pan" class="size-7" />
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="line-clamp-2 font-bold text-sand-900">{{ r.title }}</h3>
            <NutritionBadge
              size="sm"
              class="mt-1"
              :macros="{ kcal: r.kcal_per_serving, protein: r.protein_per_serving, fat: r.fat_per_serving, carb: r.carb_per_serving }"
            />
          </div>
          <AppIcon
            name="chevronRight"
            class="size-5 shrink-0 text-sand-400 transition"
            :class="{ 'rotate-90': expanded === r.id }"
          />
        </button>

        <!-- Ингредиенты с чекбоксами -->
        <div v-if="expanded === r.id" class="border-t border-sand-100 px-4 py-3">
          <p v-if="loadingId === r.id" class="text-sm text-sand-400">Загрузка…</p>
          <ul v-else class="space-y-1">
            <li
              v-for="ing in ingredientCache[r.id]"
              :key="ing.ingredient_id"
              class="flex items-center justify-between py-1.5"
            >
              <label class="flex items-center gap-2.5 text-sand-700">
                <input
                  type="checkbox"
                  class="size-5 rounded accent-brand-500"
                  :checked="selected.has(ing.ingredient_id)"
                  @change="toggleIngredient(r.id, ing)"
                />
                {{ ing.name }}
              </label>
              <span class="text-sm text-sand-400">{{ ing.grams }} г</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="sparkles"
      title="Рекомендаций пока нет"
      text="Сгенерируйте библиотеку рецептов, чтобы получать рекомендации."
    />

    <!-- Плавающая кнопка -->
    <div
      v-if="selectedCount > 0"
      class="fixed inset-x-0 bottom-20 z-30 px-4"
    >
      <button class="btn-primary mx-auto flex w-full max-w-md shadow-lg" :disabled="submitting" @click="buildList">
        <AppIcon name="basket" class="size-5" />
        Сформировать список закупа ({{ selectedCount }})
      </button>
    </div>
  </div>
</template>
