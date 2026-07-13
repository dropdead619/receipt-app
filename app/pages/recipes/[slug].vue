<script setup lang="ts">
import {
  CATEGORY_LABELS,
  CUISINE_LABELS,
  MEAL_LABELS,
  type MealType,
  type Recipe,
} from '#shared/types'
import { scaleRecipe } from '~/composables/useNutrition'

const route = useRoute()
const slug = route.params.slug as string

const { bySlug } = useRecipes()
const { isFavorite, toggleFavorite, load: loadFav } = useFavorites()
const household = useHouseholdStore()
const { add: addToShopping } = useShoppingList()
const { list: pantryList } = usePantry()

const { data: recipe } = await useAsyncData<Recipe | null>(`recipe-${slug}`, () =>
  bySlug(slug),
)
if (!recipe.value) throw createError({ statusCode: 404, statusMessage: 'Рецепт не найден' })

await household.load()
onMounted(() => loadFav())

const meal = ref<MealType>('lunch')
const meals = Object.keys(MEAL_LABELS) as MealType[]

// Масштабирование на двоих (или по настроенным взрослым)
const scaled = computed(() => {
  if (!recipe.value || !household.members.length) return null
  return scaleRecipe(recipe.value, household.members, meal.value, household.shares)
})

const displayIngredients = computed(() =>
  scaled.value?.ingredients ?? recipe.value?.ingredients ?? [],
)

const fav = computed(() => (recipe.value ? isFavorite(recipe.value.id) : false))

const addingToList = ref(false)
const addedMsg = ref('')

async function addMissingToShopping() {
  if (!recipe.value?.ingredients) return
  addingToList.value = true
  try {
    const pantry = await pantryList()
    const have = new Set(pantry.map((p) => p.ingredient_id))
    const missing = displayIngredients.value
      .filter((i) => !i.is_optional && !have.has(i.ingredient_id))
      .map((i) => ({ ingredient_id: i.ingredient_id, grams: i.grams }))
    if (!missing.length) {
      addedMsg.value = 'Всё уже есть в кладовой 👍'
      return
    }
    await addToShopping(missing, recipe.value.id)
    addedMsg.value = `Добавлено в закуп: ${missing.length}`
  } finally {
    addingToList.value = false
    setTimeout(() => (addedMsg.value = ''), 3000)
  }
}
</script>

<template>
  <div v-if="recipe">
    <!-- Фото + назад -->
    <div class="relative aspect-[4/3] bg-sand-100">
      <img
        v-if="recipe.image_url"
        :src="recipe.image_url"
        :alt="recipe.title"
        class="size-full object-cover"
      />
      <div v-else class="flex size-full items-center justify-center text-sand-300">
        <AppIcon name="pan" class="size-16" />
      </div>
      <button
        class="absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 backdrop-blur active:scale-90"
        @click="$router.back()"
      >
        <AppIcon name="chevronLeft" class="size-6 text-sand-700" />
      </button>
      <button
        class="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 backdrop-blur active:scale-90"
        @click="toggleFavorite(recipe.id)"
      >
        <AppIcon
          name="heart"
          class="size-6"
          :class="fav ? 'fill-brand-500 text-brand-500' : 'text-sand-600'"
        />
      </button>
    </div>

    <div class="space-y-5 px-4 py-4">
      <header>
        <div class="mb-1 flex gap-2 text-xs font-semibold text-brand-600">
          <template v-if="recipe.cuisine">
            <span>{{ CUISINE_LABELS[recipe.cuisine] }}</span>
            <span class="text-sand-300">•</span>
          </template>
          <span>{{ CATEGORY_LABELS[recipe.category] }}</span>
        </div>
        <h1 class="text-2xl font-extrabold leading-tight text-sand-900">
          {{ recipe.title }}
        </h1>
        <p v-if="recipe.description" class="mt-1 text-sm text-sand-500">
          {{ recipe.description }}
        </p>
        <div class="mt-2 flex items-center gap-1 text-sm text-sand-400">
          <AppIcon name="clock" class="size-4" />
          {{ recipe.time_minutes }} мин
          <span v-if="!recipe.verified" class="ml-2 text-amber-600">⚠ КБЖУ не проверено</span>
        </div>
      </header>

      <!-- Адаптировано на двоих -->
      <section class="card overflow-hidden">
        <div class="flex items-center justify-between bg-brand-500 px-4 py-2.5 text-white">
          <span class="font-bold">Адаптировано под вас</span>
          <AppIcon name="sparkles" class="size-5" />
        </div>

        <div class="p-4">
          <!-- Выбор приёма пищи -->
          <div class="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
            <button
              v-for="m in meals"
              :key="m"
              class="chip"
              :class="{ 'chip-active': meal === m }"
              @click="meal = m"
            >
              {{ MEAL_LABELS[m] }}
            </button>
          </div>

          <div v-if="scaled" class="space-y-3">
            <div
              v-for="p in scaled.portions"
              :key="p.member.id"
              class="rounded-xl bg-sand-50 p-3"
            >
              <div class="mb-1 flex items-center justify-between">
                <span class="font-semibold text-sand-800">{{ p.member.name }}</span>
                <span class="text-xs text-sand-400">×{{ p.multiplier.toFixed(2) }} порции</span>
              </div>
              <NutritionBadge :macros="p.macros" />
            </div>

            <div class="flex items-center justify-between border-t border-sand-100 pt-3">
              <span class="text-sm font-bold text-sand-700">Итого к готовке</span>
              <NutritionBadge :macros="scaled.total" />
            </div>
          </div>

          <div v-else class="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            Настройте профили взрослых, чтобы адаптировать рецепт под ваш каллораж.
            <NuxtLink to="/profile" class="font-semibold underline">Настроить →</NuxtLink>
          </div>
        </div>
      </section>

      <!-- Ингредиенты -->
      <section>
        <h2 class="mb-2 text-lg font-bold text-sand-900">Ингредиенты</h2>
        <ul class="card divide-y divide-sand-100">
          <li
            v-for="ing in displayIngredients"
            :key="ing.ingredient_id"
            class="flex items-center justify-between px-4 py-2.5"
          >
            <span class="text-sand-800">
              {{ ing.name }}
              <span v-if="ing.is_optional" class="text-xs text-sand-400">(по желанию)</span>
            </span>
            <span class="text-sm font-medium text-sand-500">
              {{ ing.grams }} г
              <span class="text-sand-300">· {{ ing.display_text }}</span>
            </span>
          </li>
        </ul>
      </section>

      <!-- Шаги -->
      <section>
        <h2 class="mb-2 text-lg font-bold text-sand-900">Приготовление</h2>
        <ol class="space-y-3">
          <li
            v-for="(step, i) in recipe.steps"
            :key="i"
            class="flex gap-3"
          >
            <span
              class="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
            >
              {{ i + 1 }}
            </span>
            <p class="pt-0.5 text-sand-700">{{ step }}</p>
          </li>
        </ol>
      </section>

      <!-- Действия -->
      <section class="space-y-2">
        <button class="btn-primary w-full" :disabled="addingToList" @click="addMissingToShopping">
          <AppIcon name="basket" class="size-5" />
          {{ addingToList ? 'Добавляю…' : 'Чего не хватает → в закуп' }}
        </button>
        <p v-if="addedMsg" class="text-center text-sm font-medium text-emerald-600">
          {{ addedMsg }}
        </p>
        <NuxtLink to="/menu" class="btn-ghost w-full">
          <AppIcon name="calendar" class="size-5" /> Добавить в меню недели
        </NuxtLink>
      </section>
    </div>
  </div>
</template>
