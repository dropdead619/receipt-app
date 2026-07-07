import type { SupabaseClient } from '@supabase/supabase-js'
import type { GeneratedRecipe } from './anthropic'
import { lookupNutrition, normalizeName, slugify, sumMacros, type Per100g } from './nutrition'

export interface PersistResult {
  id: string
  slug: string
  verified: boolean
  unresolved: string[]
}

/**
 * Сохраняет сгенерированный рецепт: матчит/создаёт ингредиенты в справочнике,
 * детерминированно пересчитывает КБЖУ из граммовки, помечает verified.
 * Требует клиент с service-role (обход RLS) — из роута или сид-скрипта.
 */
export async function persistRecipe(
  supabase: SupabaseClient,
  gen: GeneratedRecipe,
): Promise<PersistResult> {
  const unresolved: string[] = []

  // 1. Разрешаем каждый ингредиент в запись справочника
  const resolved: Array<{
    ingredient_id: string
    grams: number
    display_text: string
    is_optional: boolean
    per100: Per100g
  }> = []

  for (const ing of gen.ingredients) {
    const norm = normalizeName(ing.name)

    // Уже есть в справочнике?
    const { data: existing } = await supabase
      .from('ingredients')
      .select('id, kcal_100g, protein_100g, fat_100g, carb_100g, source_ref')
      .eq('name_normalized', norm)
      .maybeSingle()

    let ingredientId: string
    let per100: Per100g

    if (existing) {
      ingredientId = existing.id
      per100 = {
        kcal_100g: Number(existing.kcal_100g),
        protein_100g: Number(existing.protein_100g),
        fat_100g: Number(existing.fat_100g),
        carb_100g: Number(existing.carb_100g),
        source_ref: existing.source_ref,
      }
      if (per100.kcal_100g <= 0) unresolved.push(ing.name)
    } else {
      const looked = await lookupNutrition(ing.name_en)
      if (!looked) unresolved.push(ing.name)
      per100 = looked ?? {
        kcal_100g: 0, protein_100g: 0, fat_100g: 0, carb_100g: 0, source_ref: null,
      }
      const { data: inserted, error } = await supabase
        .from('ingredients')
        .insert({
          name: ing.name,
          name_normalized: norm,
          kcal_100g: per100.kcal_100g,
          protein_100g: per100.protein_100g,
          fat_100g: per100.fat_100g,
          carb_100g: per100.carb_100g,
          source_ref: per100.source_ref,
        })
        .select('id')
        .single()
      if (error) throw error
      ingredientId = inserted.id
    }

    resolved.push({
      ingredient_id: ingredientId,
      grams: ing.grams,
      display_text: ing.display_text,
      is_optional: ing.is_optional,
      per100,
    })
  }

  // 2. Детерминированный пересчёт КБЖУ на порцию
  const totals = sumMacros(resolved.map((r) => ({ grams: r.grams, per100: r.per100 })))
  const servings = Math.max(1, gen.base_servings)
  const perServing = {
    kcal: Math.round(totals.kcal / servings),
    protein: Math.round(totals.protein / servings),
    fat: Math.round(totals.fat / servings),
    carb: Math.round(totals.carb / servings),
  }

  const verified = unresolved.length === 0 && perServing.kcal > 0

  // 3. Вставляем рецепт (slug уникален)
  const slug = `${slugify(gen.title)}-${Date.now().toString(36)}`
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .insert({
      slug,
      title: gen.title,
      description: gen.description,
      cuisine: gen.cuisine,
      category: gen.category,
      base_servings: servings,
      time_minutes: gen.time_minutes,
      kcal_per_serving: perServing.kcal,
      protein_per_serving: perServing.protein,
      fat_per_serving: perServing.fat,
      carb_per_serving: perServing.carb,
      steps: gen.steps,
      source: 'ai',
      verified,
    })
    .select('id, slug')
    .single()
  if (recipeErr) throw recipeErr

  // 4. Связи рецепт-ингредиент (на случай дублей имени — схлопываем по
  // ingredient_id, суммируя граммы, чтобы совпадало с посчитанным КБЖУ)
  const byIngredient = new Map<string, {
    recipe_id: string
    ingredient_id: string
    grams: number
    display_text: string
    is_optional: boolean
  }>()
  for (const r of resolved) {
    const prev = byIngredient.get(r.ingredient_id)
    if (prev) {
      prev.grams += r.grams
      prev.is_optional = prev.is_optional && r.is_optional
    } else {
      byIngredient.set(r.ingredient_id, {
        recipe_id: recipe.id,
        ingredient_id: r.ingredient_id,
        grams: r.grams,
        display_text: r.display_text,
        is_optional: r.is_optional,
      })
    }
  }
  const links = [...byIngredient.values()]
  const { error: linkErr } = await supabase.from('recipe_ingredients').insert(links)
  if (linkErr) throw linkErr

  return { id: recipe.id, slug: recipe.slug, verified, unresolved }
}
