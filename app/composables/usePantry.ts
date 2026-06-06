export interface PantryItem {
  id: string
  ingredient_id: string
  name: string
  quantity: number | null
  unit: string | null
}

export function usePantry() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  async function list(): Promise<PantryItem[]> {
    if (!user.value) return []
    const { data } = await supabase
      .from('pantry_items')
      .select('id, ingredient_id, quantity, unit, ingredients(name)')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      ingredient_id: r.ingredient_id as string,
      quantity: r.quantity as number | null,
      unit: r.unit as string | null,
      name: (r.ingredients as { name?: string } | null)?.name ?? '',
    }))
  }

  async function add(ingredientId: string, quantity?: number, unit?: string) {
    if (!user.value) return
    await supabase.from('pantry_items').upsert(
      {
        user_id: user.value.id,
        ingredient_id: ingredientId,
        quantity: quantity ?? null,
        unit: unit ?? null,
      },
      { onConflict: 'user_id,ingredient_id' },
    )
  }

  async function remove(id: string) {
    await supabase.from('pantry_items').delete().eq('id', id)
  }

  /** Поиск ингредиентов в справочнике (для автодополнения). */
  async function searchIngredients(query: string) {
    if (query.trim().length < 2) return []
    const { data } = await supabase
      .from('ingredients')
      .select('id, name')
      .ilike('name', `%${query.trim()}%`)
      .limit(8)
    return (data ?? []) as { id: string; name: string }[]
  }

  return { list, add, remove, searchIngredients }
}
