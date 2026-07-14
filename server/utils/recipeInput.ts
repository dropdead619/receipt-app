import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Cuisine } from '#shared/types'
import { CATEGORY_LABELS, CUISINE_LABELS } from '#shared/types'
import { normalizeName } from './nutrition'

// Общий разбор/валидация тела рецепта для create и update

interface IngredientInput {
  name: string
  grams?: number | null
  display_text?: string
  is_optional?: boolean
}

export interface RecipeBody {
  title: string
  description?: string
  cuisine?: Cuisine | null
  category: Category
  base_servings: number
  time_minutes: number
  image_url?: string
  /** В чём заданы kcal/protein/fat/carb: на порцию или на 100 г блюда */
  nutrition_basis?: 'per_serving' | 'per_100g'
  kcal: number
  protein: number
  fat: number
  carb: number
  ingredients: IngredientInput[]
  steps: string[]
}

export interface ParsedRecipe {
  title: string
  description: string | null
  cuisine: Cuisine | null
  category: Category
  servings: number
  timeMinutes: number
  imageUrl: string | null
  kcal: number
  protein: number
  fat: number
  carb: number
  steps: string[]
  ingredients: Array<{
    name: string
    grams: number
    display_text: string
    is_optional: boolean
  }>
}

function bad(message: string): never {
  throw createError({ statusCode: 400, message })
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function parseRecipeBody(body: RecipeBody): ParsedRecipe {
  const title = String(body.title ?? '').trim()
  if (!title) bad('Укажите название рецепта')
  const cuisine = body.cuisine || null
  if (cuisine && !(cuisine in CUISINE_LABELS)) bad('Неизвестная кухня')
  if (!(body.category in CATEGORY_LABELS)) bad('Неизвестная категория')

  const servings = Math.round(num(body.base_servings, 2))
  if (servings < 1 || servings > 50) bad('Порции: от 1 до 50')

  const timeMinutes = Math.round(num(body.time_minutes, 30))
  if (timeMinutes < 1 || timeMinutes > 24 * 60) bad('Время приготовления: от 1 минуты до суток')

  const basis = body.nutrition_basis === 'per_serving' ? 'per_serving' : 'per_100g'
  const kcalIn = num(body.kcal)
  const proteinIn = num(body.protein)
  const fatIn = num(body.fat)
  const carbIn = num(body.carb)
  if (kcalIn <= 0)
    bad(basis === 'per_100g' ? 'Укажите калорийность на 100 грамм' : 'Укажите калорийность порции')
  if (proteinIn < 0 || fatIn < 0 || carbIn < 0) bad('БЖУ не могут быть отрицательными')

  const imageUrl = String(body.image_url ?? '').trim()
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) bad('Ссылка на фото должна начинаться с http(s)://')

  const ingredients = (body.ingredients ?? [])
    .map((i) => ({
      name: String(i.name ?? '').trim(),
      grams: Math.max(0, num(i.grams)),
      display_text: String(i.display_text ?? '').trim(),
      is_optional: Boolean(i.is_optional),
    }))
    .filter((i) => i.name)
  if (!ingredients.length) bad('Добавьте хотя бы один ингредиент')

  // КБЖУ храним на порцию; если задан на 100 г — пересчитываем через общий вес ингредиентов
  const round1 = (v: number) => Math.round(v * 10) / 10
  let kcal = round1(kcalIn)
  let protein = round1(proteinIn)
  let fat = round1(fatIn)
  let carb = round1(carbIn)
  if (basis === 'per_100g') {
    const totalGrams = ingredients.reduce((s, i) => s + i.grams, 0)
    if (totalGrams <= 0)
      bad('Укажите вес хотя бы одного ингредиента — без него не пересчитать КБЖУ на порцию')
    const gramsPerServing = totalGrams / servings
    const toServing = (v: number) => round1((v * gramsPerServing) / 100)
    kcal = toServing(kcalIn)
    protein = toServing(proteinIn)
    fat = toServing(fatIn)
    carb = toServing(carbIn)
  }

  const steps = (body.steps ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
  if (!steps.length) bad('Добавьте хотя бы один шаг приготовления')

  return {
    title,
    description: String(body.description ?? '').trim() || null,
    cuisine,
    category: body.category,
    servings,
    timeMinutes,
    imageUrl: imageUrl || null,
    kcal,
    protein,
    fat,
    carb,
    steps,
    ingredients,
  }
}

export interface IngredientLink {
  ingredient_id: string
  grams: number
  display_text: string
  is_optional: boolean
}

/**
 * Матчит ингредиенты по нормализованному имени (иначе создаёт запись в справочнике).
 * Дубли схлопываются (граммы суммируются) — PK (recipe_id, ingredient_id).
 */
export async function resolveIngredientLinks(
  supabase: SupabaseClient,
  ingredients: ParsedRecipe['ingredients'],
): Promise<IngredientLink[]> {
  const links = new Map<string, IngredientLink>()

  for (const ing of ingredients) {
    const norm = normalizeName(ing.name)
    const { data: existing, error: findErr } = await supabase
      .from('ingredients')
      .select('id')
      .eq('name_normalized', norm)
      .maybeSingle()
    if (findErr) throw findErr

    let ingredientId = existing?.id as string | undefined
    if (!ingredientId) {
      // КБЖУ на 100 г неизвестен — нули; на расчёты не влияет,
      // КБЖУ порции пользователь задал сам.
      const { data: inserted, error: insErr } = await supabase
        .from('ingredients')
        .insert({
          name: ing.name,
          name_normalized: norm,
          kcal_100g: 0,
          protein_100g: 0,
          fat_100g: 0,
          carb_100g: 0,
          source_ref: null,
        })
        .select('id')
        .single()
      if (insErr) throw insErr
      ingredientId = inserted.id as string
    }

    const prev = links.get(ingredientId!)
    if (prev) {
      prev.grams += ing.grams
    } else {
      links.set(ingredientId!, {
        ingredient_id: ingredientId!,
        grams: ing.grams,
        display_text: ing.display_text || (ing.grams ? `${ing.grams} г` : 'по вкусу'),
        is_optional: ing.is_optional,
      })
    }
  }

  return [...links.values()]
}
