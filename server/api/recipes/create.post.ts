import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Category, Cuisine } from '#shared/types'
import { CATEGORY_LABELS, CUISINE_LABELS } from '#shared/types'
import { normalizeName, slugify } from '~~/server/utils/nutrition'

interface IngredientInput {
  name: string
  grams: number
  display_text?: string
  is_optional?: boolean
}

export interface CreateRecipeBody {
  title: string
  description?: string
  cuisine: Cuisine
  category: Category
  base_servings: number
  time_minutes: number
  image_url?: string
  kcal_per_serving: number
  protein_per_serving: number
  fat_per_serving: number
  carb_per_serving: number
  ingredients: IngredientInput[]
  steps: string[]
}

function bad(message: string): never {
  throw createError({ statusCode: 400, message })
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export default defineEventHandler(async (event) => {
  // Добавлять рецепты могут только авторизованные
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Требуется вход' })

  const body = await readBody<CreateRecipeBody>(event)

  // ── Валидация ──
  const title = String(body.title ?? '').trim()
  if (!title) bad('Укажите название рецепта')
  if (!(body.cuisine in CUISINE_LABELS)) bad('Неизвестная кухня')
  if (!(body.category in CATEGORY_LABELS)) bad('Неизвестная категория')

  const servings = Math.round(num(body.base_servings, 2))
  if (servings < 1 || servings > 50) bad('Порции: от 1 до 50')

  const timeMinutes = Math.round(num(body.time_minutes, 30))
  if (timeMinutes < 1 || timeMinutes > 24 * 60) bad('Время приготовления: от 1 минуты до суток')

  const kcal = num(body.kcal_per_serving)
  const protein = num(body.protein_per_serving)
  const fat = num(body.fat_per_serving)
  const carb = num(body.carb_per_serving)
  if (kcal <= 0) bad('Укажите калорийность порции')
  if (protein < 0 || fat < 0 || carb < 0) bad('БЖУ не могут быть отрицательными')

  const imageUrl = String(body.image_url ?? '').trim()
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) bad('Ссылка на фото должна начинаться с http(s)://')

  const ingredients = (body.ingredients ?? [])
    .map((i) => ({
      name: String(i.name ?? '').trim(),
      grams: num(i.grams),
      display_text: String(i.display_text ?? '').trim(),
      is_optional: Boolean(i.is_optional),
    }))
    .filter((i) => i.name)
  if (!ingredients.length) bad('Добавьте хотя бы один ингредиент')
  for (const ing of ingredients) {
    if (ing.grams <= 0) bad(`Укажите граммы для «${ing.name}»`)
  }

  const steps = (body.steps ?? []).map((s) => String(s ?? '').trim()).filter(Boolean)
  if (!steps.length) bad('Добавьте хотя бы один шаг приготовления')

  const supabase = serverSupabaseServiceRole(event)

  // ── Ингредиенты: матчим по нормализованному имени, иначе создаём.
  // Дубли схлопываем (граммы суммируются) — PK (recipe_id, ingredient_id).
  const links = new Map<
    string,
    { ingredient_id: string; grams: number; display_text: string; is_optional: boolean }
  >()

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
      ingredientId = inserted.id
    }

    const prev = links.get(ingredientId!)
    if (prev) {
      prev.grams += ing.grams
    } else {
      links.set(ingredientId!, {
        ingredient_id: ingredientId!,
        grams: ing.grams,
        display_text: ing.display_text || `${ing.grams} г`,
        is_optional: ing.is_optional,
      })
    }
  }

  // ── Рецепт ──
  const slug = `${slugify(title)}-${Date.now().toString(36)}`
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .insert({
      slug,
      title,
      description: String(body.description ?? '').trim() || null,
      cuisine: body.cuisine,
      category: body.category,
      base_servings: servings,
      time_minutes: timeMinutes,
      kcal_per_serving: kcal,
      protein_per_serving: protein,
      fat_per_serving: fat,
      carb_per_serving: carb,
      steps,
      image_url: imageUrl || null,
      source: 'manual',
      verified: true,
    })
    .select('id, slug')
    .single()
  if (recipeErr) throw recipeErr

  const { error: linkErr } = await supabase.from('recipe_ingredients').insert(
    [...links.values()].map((l) => ({ recipe_id: recipe.id, ...l })),
  )
  if (linkErr) {
    // Не оставляем рецепт без ингредиентов
    await supabase.from('recipes').delete().eq('id', recipe.id)
    throw linkErr
  }

  return { id: recipe.id, slug: recipe.slug }
})
