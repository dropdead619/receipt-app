import type { RecipeIngredient } from '#shared/types'

export interface ShoppingListItem {
  id: string
  ingredient_id: string
  grams: number | null
  checked: boolean
  source_recipe_id: string | null
  name?: string
}

export function useShoppingList() {
  const supabase = useSupabaseClient()

  async function list(): Promise<ShoppingListItem[]> {
    const uid = currentUserId()
    if (!uid) return []
    const { data } = await supabase
      .from('shopping_list_items')
      .select('id, ingredient_id, grams, checked, source_recipe_id, ingredients(name)')
      .eq('user_id', uid)
      .order('checked', { ascending: true })
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      ingredient_id: r.ingredient_id as string,
      grams: r.grams as number | null,
      checked: r.checked as boolean,
      source_recipe_id: r.source_recipe_id as string | null,
      name: (r.ingredients as { name?: string } | null)?.name,
    }))
  }

  /** Добавляет ингредиенты в список закупа. */
  async function add(
    items: Array<Pick<RecipeIngredient, 'ingredient_id' | 'grams'>>,
    sourceRecipeId?: string,
  ) {
    const uid = currentUserId()
    if (!uid || !items.length) return
    const rows = items.map((i) => ({
      user_id: uid,
      ingredient_id: i.ingredient_id,
      grams: Math.round(i.grams),
      source_recipe_id: sourceRecipeId ?? null,
    }))
    await supabase.from('shopping_list_items').insert(rows)
  }

  async function toggle(id: string, checked: boolean) {
    await supabase.from('shopping_list_items').update({ checked }).eq('id', id)
  }

  async function remove(id: string) {
    await supabase.from('shopping_list_items').delete().eq('id', id)
  }

  async function clearChecked() {
    const uid = currentUserId()
    if (!uid) return
    await supabase
      .from('shopping_list_items')
      .delete()
      .eq('user_id', uid)
      .eq('checked', true)
  }

  return { list, add, toggle, remove, clearChecked }
}
