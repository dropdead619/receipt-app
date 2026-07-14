import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { slugify } from '~~/server/utils/nutrition'
import { parseRecipeBody, resolveIngredientLinks, type RecipeBody } from '~~/server/utils/recipeInput'

export default defineEventHandler(async (event) => {
  // Добавлять рецепты могут только авторизованные
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Требуется вход' })

  const body = await readBody<RecipeBody>(event)
  const parsed = parseRecipeBody(body)

  const supabase = serverSupabaseServiceRole(event)
  const links = await resolveIngredientLinks(supabase, parsed.ingredients)

  // ── Рецепт ──
  const slug = `${slugify(parsed.title)}-${Date.now().toString(36)}`
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .insert({
      slug,
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
      image_url: parsed.imageUrl,
      source: 'manual',
      verified: true,
    })
    .select('id, slug')
    .single()
  if (recipeErr) throw recipeErr

  const { error: linkErr } = await supabase.from('recipe_ingredients').insert(
    links.map((l) => ({ recipe_id: recipe.id, ...l })),
  )
  if (linkErr) {
    // Не оставляем рецепт без ингредиентов
    await supabase.from('recipes').delete().eq('id', recipe.id)
    throw linkErr
  }

  return { id: recipe.id, slug: recipe.slug }
})
