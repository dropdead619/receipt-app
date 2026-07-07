<script setup lang="ts">
import { MEAL_LABELS, type MealType, type Recipe } from '#shared/types'
import { addWeeks, mondayOf, parseLocalDate, useMenu, type MenuEntry } from '~/composables/useMenu'

const { getOrCreateWeek, loadEntries, setEntry, removeEntry } = useMenu()
const { bySlug } = useRecipes()
const { add: addToShopping } = useShoppingList()
const household = useHouseholdStore()

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MEALS = Object.keys(MEAL_LABELS) as MealType[]

const weekStart = ref(mondayOf(new Date()))
const menuId = ref<string | null>(null)
const entries = ref<MenuEntry[]>([])

await household.load()
const servings = computed(() => Math.max(1, household.members.length || 2))

async function reload() {
  menuId.value = await getOrCreateWeek(weekStart.value)
  entries.value = menuId.value ? await loadEntries(menuId.value) : []
}
await reload()
watch(weekStart, reload)

function entryFor(day: number, meal: MealType): MenuEntry | undefined {
  return entries.value.find((e) => e.day_of_week === day && e.meal_type === meal)
}

function dayTotalKcal(day: number): number {
  return entries.value
    .filter((e) => e.day_of_week === day)
    .reduce((s, e) => s + (e.recipe?.kcal_per_serving ?? 0) * e.servings, 0)
}

const weekTotalKcal = computed(() =>
  entries.value.reduce((s, e) => s + (e.recipe?.kcal_per_serving ?? 0) * e.servings, 0),
)

// ── Выбор рецепта в слот ──
const picker = ref<{ day: number; meal: MealType } | null>(null)

async function onPick(recipe: Recipe) {
  if (!menuId.value || !picker.value) return
  const { day, meal } = picker.value
  await setEntry(menuId.value, day, meal, recipe.id, servings.value)
  picker.value = null
  await reload()
}

async function clearSlot(day: number, meal: MealType) {
  if (!menuId.value) return
  await removeEntry(menuId.value, day, meal)
  await reload()
}

// ── Список закупа на неделю ──
const buildingList = ref(false)
async function buildWeekShopping() {
  buildingList.value = true
  try {
    const agg = new Map<string, number>() // ingredient_id -> grams
    // Каждый рецепт грузим один раз, но граммовку считаем по каждому слоту меню
    const uniqueSlugs = [...new Set(entries.value.map((e) => e.recipe?.slug).filter(Boolean))] as string[]
    const fullBySlug = new Map<string, Recipe>()
    for (const slug of uniqueSlugs) {
      const full = await bySlug(slug)
      if (full) fullBySlug.set(slug, full)
    }
    for (const entry of entries.value) {
      const full = entry.recipe?.slug ? fullBySlug.get(entry.recipe.slug) : undefined
      if (!full?.ingredients) continue
      const scale = (entry.servings || servings.value) / Math.max(1, full.base_servings)
      for (const ing of full.ingredients) {
        if (ing.is_optional) continue
        agg.set(ing.ingredient_id, (agg.get(ing.ingredient_id) ?? 0) + ing.grams * scale)
      }
    }
    const items = [...agg.entries()].map(([ingredient_id, grams]) => ({ ingredient_id, grams }))
    await addToShopping(items)
    await navigateTo('/shopping-list')
  } finally {
    buildingList.value = false
  }
}

function weekLabel(start: string): string {
  const d = parseLocalDate(start)
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  const fmt = (x: Date) => `${x.getDate()}.${String(x.getMonth() + 1).padStart(2, '0')}`
  return `${fmt(d)} – ${fmt(end)}`
}
</script>

<template>
  <div class="px-4 pt-safe pb-4">
    <header class="pt-4">
      <h1 class="text-2xl font-extrabold text-sand-900">Меню на неделю</h1>

      <div class="mt-3 flex items-center justify-between">
        <button
          class="grid size-9 place-items-center rounded-full bg-sand-100 active:scale-90"
          @click="weekStart = addWeeks(weekStart, -1)"
        >
          <AppIcon name="chevronLeft" class="size-5 text-sand-600" />
        </button>
        <div class="text-center">
          <div class="font-semibold text-sand-800">{{ weekLabel(weekStart) }}</div>
          <div class="text-xs text-sand-400">≈ {{ weekTotalKcal }} ккал за неделю</div>
        </div>
        <button
          class="grid size-9 place-items-center rounded-full bg-sand-100 active:scale-90"
          @click="weekStart = addWeeks(weekStart, 1)"
        >
          <AppIcon name="chevronRight" class="size-5 text-sand-600" />
        </button>
      </div>
    </header>

    <!-- Сетка дней (горизонтальный скролл) -->
    <div class="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
      <div v-for="(label, day) in DAYS" :key="day" class="w-40 shrink-0">
        <div class="mb-2 flex items-center justify-between px-1">
          <span class="font-bold text-sand-800">{{ label }}</span>
          <span class="text-xs text-sand-400">{{ dayTotalKcal(day) }} ккал</span>
        </div>

        <div class="space-y-2">
          <div v-for="meal in MEALS" :key="meal">
            <div class="mb-1 text-[11px] font-medium uppercase tracking-wide text-sand-400">
              {{ MEAL_LABELS[meal] }}
            </div>

            <!-- Заполненный слот -->
            <div
              v-if="entryFor(day, meal)"
              class="card relative overflow-hidden"
            >
              <NuxtLink :to="`/recipes/${entryFor(day, meal)!.recipe?.slug}`">
                <div class="aspect-[3/2] bg-sand-100">
                  <img
                    v-if="entryFor(day, meal)!.recipe?.image_url"
                    :src="entryFor(day, meal)!.recipe?.image_url!"
                    class="size-full object-cover"
                  />
                  <div v-else class="flex size-full items-center justify-center text-sand-300">
                    <AppIcon name="pan" class="size-6" />
                  </div>
                </div>
                <div class="p-2">
                  <p class="line-clamp-2 text-xs font-semibold text-sand-900">
                    {{ entryFor(day, meal)!.recipe?.title }}
                  </p>
                  <p class="mt-0.5 text-[11px] text-brand-600">
                    {{ entryFor(day, meal)!.recipe?.kcal_per_serving }} ккал
                  </p>
                </div>
              </NuxtLink>
              <button
                class="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/50 text-white active:scale-90"
                @click="clearSlot(day, meal)"
              >
                <AppIcon name="x" class="size-3.5" />
              </button>
            </div>

            <!-- Пустой слот -->
            <button
              v-else
              class="flex h-16 w-full items-center justify-center rounded-xl border-2 border-dashed border-sand-200 text-sand-300 active:bg-sand-100"
              @click="picker = { day, meal }"
            >
              <AppIcon name="plus" class="size-6" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <button class="btn-primary mt-4 w-full" :disabled="buildingList || !entries.length" @click="buildWeekShopping">
      <AppIcon name="basket" class="size-5" />
      {{ buildingList ? 'Собираю…' : 'Список закупа на неделю' }}
    </button>

    <RecipePicker v-if="picker" @select="onPick" @close="picker = null" />
  </div>
</template>
