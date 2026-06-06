import { serverSupabaseClient } from '#supabase/server'

interface MatchRow {
  recipe_id: string
  total_count: number
  have_count: number
  missing_count: number
  match_ratio: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ingredientIds: string[] }>(event)
  const ingredientIds = body.ingredientIds ?? []
  if (!ingredientIds.length) return { recipes: [] }

  const supabase = await serverSupabaseClient(event)

  // RPC: ранжирование рецептов по доле имеющихся ингредиентов
  const { data: matches, error } = await supabase.rpc('recipes_by_ingredients', {
    p_ingredient_ids: ingredientIds,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (matches ?? []) as MatchRow[]
  const ids = rows.map((r) => r.recipe_id)
  if (!ids.length) return { recipes: [] }

  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .in('id', ids)
    .eq('verified', true)

  const byId = new Map((recipes ?? []).map((r) => [r.id, r]))

  // Возвращаем рецепты с метаданными совпадения, сохраняя порядок ранжирования
  const result = rows
    .map((m) => {
      const recipe = byId.get(m.recipe_id)
      if (!recipe) return null
      return {
        recipe,
        total: m.total_count,
        have: m.have_count,
        missing: m.missing_count,
        ratio: m.match_ratio,
      }
    })
    .filter(Boolean)

  return { recipes: result }
})
