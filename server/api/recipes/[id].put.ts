import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { parseRecipeBody, resolveIngredientLinks, type RecipeBody } from '~~/server/utils/recipeInput'

export default defineEventHandler(async (event) => {
  // Редактировать рецепты могут только авторизованные
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Требуется вход' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Не указан рецепт' })

  const body = await readBody<RecipeBody>(event)
  const parsed = parseRecipeBody(body)

  const supabase = serverSupabaseServiceRole(event)

  const { data: existing, error: findErr } = await supabase
    .from('recipes')
    .select('id, slug')
    .eq('id', id)
    .maybeSingle()
  if (findErr) throw findErr
  if (!existing) throw createError({ statusCode: 404, message: 'Рецепт не найден' })

  const links = await resolveIngredientLinks(supabase, parsed.ingredients)

  // slug не меняем — ссылки на рецепт остаются рабочими
  const { error: updateErr } = await supabase
    .from('recipes')
    .update({
      title: parsed.title,
      description: parsed.description,
      cuisine: parsed.cuisine,
      category: parsed.category,
      base_servings: parsed.servings,
      time_minutes: parsed.timeMinutes,
      kcal_per_serving: parsed.kcal,
      protein_per_serving: parsed.protein,
      fat_per_serving: parsed.fat,
      carb_per_serving: parsed.carb,
      steps: parsed.steps,
    })
    .eq('id', id)
  if (updateErr) throw updateErr

  // Пересобираем ингредиенты; старый набор держим для отката, чтобы
  // при ошибке вставки рецепт не остался без ингредиентов
  const { data: oldLinks } = await supabase
    .from('recipe_ingredients')
    .select('ingredient_id, grams, display_text, is_optional')
    .eq('recipe_id', id)

  const { error: delErr } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', id)
  if (delErr) throw delErr

  const { error: linkErr } = await supabase.from('recipe_ingredients').insert(
    links.map((l) => ({ recipe_id: id, ...l })),
  )
  if (linkErr) {
    if (oldLinks?.length) {
      await supabase.from('recipe_ingredients').insert(
        oldLinks.map((l) => ({ recipe_id: id, ...l })),
      )
    }
    throw linkErr
  }

  return { id: existing.id, slug: existing.slug }
})
