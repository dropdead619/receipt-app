<script setup lang="ts">
import {
  CATEGORY_LABELS,
  CUISINE_LABELS,
  type Category,
  type Cuisine,
  type Recipe,
} from '#shared/types'

interface IngredientRow {
  name: string
  grams: number | null
  display_text: string
  is_optional: boolean
}

const props = defineProps<{
  /** Рецепт для предзаполнения (режим редактирования) */
  initial?: Recipe | null
  saving: boolean
  /** Ошибка сохранения от родителя (ответ сервера) */
  serverError?: string
  submitLabel?: string
}>()

const emit = defineEmits<{
  submit: [body: Record<string, unknown>]
}>()

const cuisines = Object.entries(CUISINE_LABELS) as [Cuisine, string][]
const categories = Object.entries(CATEGORY_LABELS) as [Category, string][]

const form = reactive({
  title: props.initial?.title ?? '',
  description: props.initial?.description ?? '',
  cuisine: (props.initial?.cuisine ?? null) as Cuisine | null,
  category: (props.initial?.category ?? 'main') as Category,
  base_servings: props.initial?.base_servings ?? 2,
  time_minutes: props.initial?.time_minutes ?? 30,
  kcal: (props.initial?.kcal_per_serving ?? null) as number | null,
  protein: (props.initial?.protein_per_serving ?? null) as number | null,
  fat: (props.initial?.fat_per_serving ?? null) as number | null,
  carb: (props.initial?.carb_per_serving ?? null) as number | null,
})

// В чём пользователь указывает КБЖУ: на порцию или на 100 г блюда.
// В базе КБЖУ хранится на порцию, поэтому при редактировании — «на порцию».
const nutritionBasis = ref<'per_serving' | 'per_100g'>(
  props.initial ? 'per_serving' : 'per_100g',
)

const ingredients = ref<IngredientRow[]>(
  props.initial?.ingredients?.length
    ? props.initial.ingredients.map((i) => ({
        name: i.name,
        grams: i.grams || null,
        display_text: i.display_text,
        is_optional: i.is_optional,
      }))
    : [emptyIngredient()],
)
const steps = ref<string[]>(props.initial?.steps?.length ? [...props.initial.steps] : [''])

function emptyIngredient(): IngredientRow {
  return { name: '', grams: null, display_text: '', is_optional: false }
}

function addIngredient() {
  ingredients.value.push(emptyIngredient())
}
function removeIngredient(i: number) {
  ingredients.value.splice(i, 1)
  if (!ingredients.value.length) addIngredient()
}

function addStep() {
  steps.value.push('')
}
function removeStep(i: number) {
  steps.value.splice(i, 1)
  if (!steps.value.length) addStep()
}
function moveStep(i: number, delta: -1 | 1) {
  const j = i + delta
  if (j < 0 || j >= steps.value.length) return
  const arr = steps.value
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
}

const localError = ref('')
const error = computed(() => localError.value || props.serverError || '')

// Общий вес блюда по ингредиентам — из него сервер считает КБЖУ порции
const totalGrams = computed(() =>
  ingredients.value
    .filter((i) => i.name.trim())
    .reduce((s, i) => s + (i.grams || 0), 0),
)
const kcalPerServing = computed(() => {
  if (nutritionBasis.value !== 'per_100g') return null
  if (!form.kcal || !totalGrams.value || !form.base_servings) return null
  return Math.round((form.kcal * totalGrams.value) / 100 / form.base_servings)
})

function validate(): string | null {
  if (!form.title.trim()) return 'Укажите название рецепта'
  if (!form.base_servings || form.base_servings < 1) return 'Укажите количество порций'
  if (!form.time_minutes || form.time_minutes < 1) return 'Укажите время приготовления'
  if (!form.kcal || form.kcal <= 0)
    return nutritionBasis.value === 'per_100g'
      ? 'Укажите калорийность на 100 грамм'
      : 'Укажите калорийность порции'
  const filledIngredients = ingredients.value.filter((i) => i.name.trim())
  if (!filledIngredients.length) return 'Добавьте хотя бы один ингредиент'
  if (nutritionBasis.value === 'per_100g' && !totalGrams.value)
    return 'Укажите вес хотя бы одного ингредиента — без него не пересчитать КБЖУ на порцию'
  if (!steps.value.some((s) => s.trim())) return 'Добавьте хотя бы один шаг приготовления'
  return null
}

function submit() {
  localError.value = ''
  const problem = validate()
  if (problem) {
    localError.value = problem
    return
  }
  emit('submit', {
    ...form,
    nutrition_basis: nutritionBasis.value,
    protein: form.protein ?? 0,
    fat: form.fat ?? 0,
    carb: form.carb ?? 0,
    ingredients: ingredients.value
      .filter((i) => i.name.trim())
      .map((i) => ({ ...i, name: i.name.trim() })),
    steps: steps.value.map((s) => s.trim()).filter(Boolean),
  })
}
</script>

<template>
  <form class="mt-4 space-y-5" @submit.prevent="submit">
    <!-- Основное -->
    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-bold uppercase tracking-wide text-sand-500">Основное</h2>

      <label class="block">
        <span class="mb-1 block text-xs font-medium text-sand-500">Название *</span>
        <input v-model="form.title" placeholder="Например, борщ с говядиной" class="input" />
      </label>

      <label class="block">
        <span class="mb-1 block text-xs font-medium text-sand-500">Описание</span>
        <textarea
          v-model="form.description"
          rows="2"
          placeholder="Коротко о блюде…"
          class="input resize-none"
        />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-sand-500">Кухня</span>
          <select v-model="form.cuisine" class="input py-2.5">
            <option :value="null">Не указана</option>
            <option v-for="[v, l] in cuisines" :key="v" :value="v">{{ l }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-sand-500">Категория</span>
          <select v-model="form.category" class="input py-2.5">
            <option v-for="[v, l] in categories" :key="v" :value="v">{{ l }}</option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-sand-500">Порций *</span>
          <input
            v-model.number="form.base_servings"
            type="number"
            min="1"
            max="50"
            class="input py-2.5"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-medium text-sand-500">Время, мин *</span>
          <input
            v-model.number="form.time_minutes"
            type="number"
            min="1"
            class="input py-2.5"
          />
        </label>
      </div>
    </section>

    <!-- КБЖУ -->
    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-bold uppercase tracking-wide text-sand-500">КБЖУ</h2>
      <div class="flex gap-2">
        <button
          type="button"
          class="chip"
          :class="{ 'chip-active': nutritionBasis === 'per_serving' }"
          @click="nutritionBasis = 'per_serving'"
        >
          На порцию
        </button>
        <button
          type="button"
          class="chip"
          :class="{ 'chip-active': nutritionBasis === 'per_100g' }"
          @click="nutritionBasis = 'per_100g'"
        >
          На 100 г
        </button>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <label class="block">
          <span class="mb-1 block text-[10px] font-medium text-sand-500">ккал *</span>
          <input
            v-model.number="form.kcal"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            class="input px-2 py-2 text-sm"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[10px] font-medium text-sand-500">Белки, г</span>
          <input
            v-model.number="form.protein"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            class="input px-2 py-2 text-sm"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[10px] font-medium text-sand-500">Жиры, г</span>
          <input
            v-model.number="form.fat"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            class="input px-2 py-2 text-sm"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[10px] font-medium text-sand-500">Углев., г</span>
          <input
            v-model.number="form.carb"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            class="input px-2 py-2 text-sm"
          />
        </label>
      </div>
      <p v-if="kcalPerServing" class="text-xs text-sand-500">
        Вес блюда по ингредиентам: {{ totalGrams }} г · ≈{{ kcalPerServing }} ккал на порцию
      </p>
      <p v-else-if="nutritionBasis === 'per_100g'" class="text-xs text-sand-400">
        Порция рассчитается по весу ингредиентов
      </p>
    </section>

    <!-- Ингредиенты -->
    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-bold uppercase tracking-wide text-sand-500">
        Ингредиенты ({{ ingredients.filter((i) => i.name.trim()).length }})
      </h2>

      <div
        v-for="(ing, i) in ingredients"
        :key="i"
        class="space-y-2 rounded-xl bg-sand-50 p-3"
      >
        <div class="flex gap-2">
          <input
            v-model="ing.name"
            placeholder="Продукт, напр. куриное филе"
            class="input flex-1 py-2.5"
          />
          <button
            type="button"
            class="grid size-11 shrink-0 place-items-center rounded-xl bg-sand-100 text-sand-500 active:scale-90"
            aria-label="Удалить ингредиент"
            @click="removeIngredient(i)"
          >
            <AppIcon name="trash" class="size-5" />
          </button>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model.number="ing.grams"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            placeholder="Граммы"
            class="input w-24 py-2.5"
          />
          <input
            v-model="ing.display_text"
            placeholder="Напр. 2 шт. / 1 ст. л."
            class="input flex-1 py-2.5"
          />
        </div>
        <label class="flex items-center gap-2 text-sm text-sand-600">
          <input v-model="ing.is_optional" type="checkbox" class="size-4 accent-brand-500" />
          По желанию (не обязателен)
        </label>
      </div>

      <button type="button" class="btn-ghost w-full" @click="addIngredient">
        <AppIcon name="plus" class="size-5" /> Добавить ингредиент
      </button>
    </section>

    <!-- Шаги -->
    <section class="card space-y-3 p-4">
      <h2 class="text-sm font-bold uppercase tracking-wide text-sand-500">
        Шаги приготовления ({{ steps.filter((s) => s.trim()).length }})
      </h2>

      <div v-for="(_, i) in steps" :key="i" class="flex gap-2">
        <span
          class="mt-2 grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
        >
          {{ i + 1 }}
        </span>
        <textarea
          v-model="steps[i]"
          rows="2"
          :placeholder="`Шаг ${i + 1}…`"
          class="input flex-1 resize-none py-2.5"
        />
        <div class="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg bg-sand-100 text-sand-500 active:scale-90 disabled:opacity-30"
            :disabled="i === 0"
            aria-label="Выше"
            @click="moveStep(i, -1)"
          >
            <AppIcon name="chevronLeft" class="size-4 rotate-90" />
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg bg-sand-100 text-sand-500 active:scale-90 disabled:opacity-30"
            :disabled="i === steps.length - 1"
            aria-label="Ниже"
            @click="moveStep(i, 1)"
          >
            <AppIcon name="chevronRight" class="size-4 rotate-90" />
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg bg-sand-100 text-sand-500 active:scale-90"
            aria-label="Удалить шаг"
            @click="removeStep(i)"
          >
            <AppIcon name="trash" class="size-4" />
          </button>
        </div>
      </div>

      <button type="button" class="btn-ghost w-full" @click="addStep">
        <AppIcon name="plus" class="size-5" /> Добавить шаг
      </button>
    </section>

    <p v-if="error" class="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
      {{ error }}
    </p>

    <button type="submit" class="btn-primary w-full" :disabled="saving">
      <AppIcon name="check" class="size-5" />
      {{ saving ? 'Сохраняю…' : (submitLabel ?? 'Сохранить рецепт') }}
    </button>
  </form>
</template>
