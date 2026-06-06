import type { Category, Cuisine, Recipe } from '#shared/types'

export interface RecipeFilters {
  cuisine?: Cuisine | null
  category?: Category | null
  search?: string
}

export function useRecipes() {
  const supabase = useSupabaseClient()

  async function list(filters: RecipeFilters = {}): Promise<Recipe[]> {
    let query = supabase
      .from('recipes')
      .select('*')
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(60)

    if (filters.cuisine) query = query.eq('cuisine', filters.cuisine)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.search) query = query.ilike('title', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as unknown as Recipe[]
  }

  async function bySlug(slug: string): Promise<Recipe | null> {
    const { data, error } = await supabase
      .from('recipes')
      .select(
        '*, recipe_ingredients(grams, display_text, is_optional, ingredients(id, name))',
      )
      .eq('slug', slug)
      .single()
    if (error) return null

    const row = data as Record<string, unknown>
    const ri = (row.recipe_ingredients ?? []) as Array<{
      grams: number
      display_text: string
      is_optional: boolean
      ingredients: { id: string; name: string } | null
    }>

    return {
      ...(row as unknown as Recipe),
      ingredients: ri.map((r) => ({
        ingredient_id: r.ingredients?.id ?? '',
        name: r.ingredients?.name ?? '',
        grams: r.grams,
        display_text: r.display_text,
        is_optional: r.is_optional,
      })),
    }
  }

  async function byIds(ids: string[]): Promise<Recipe[]> {
    if (!ids.length) return []
    const { data } = await supabase.from('recipes').select('*').in('id', ids)
    return (data ?? []) as unknown as Recipe[]
  }

  return { list, bySlug, byIds }
}
