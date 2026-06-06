// Избранное: реактивное множество id + синхронизация с Supabase.
export function useFavorites() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const ids = useState<Set<string>>('favorite-ids', () => new Set())
  const loaded = useState<boolean>('favorites-loaded', () => false)

  async function load(force = false) {
    if (!user.value || (loaded.value && !force)) return
    const { data } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', user.value.id)
    ids.value = new Set((data ?? []).map((r: { recipe_id: string }) => r.recipe_id))
    loaded.value = true
  }

  const isFavorite = (recipeId: string) => ids.value.has(recipeId)

  async function toggleFavorite(recipeId: string) {
    if (!user.value) {
      return navigateTo('/auth/login')
    }
    const next = new Set(ids.value)
    if (next.has(recipeId)) {
      next.delete(recipeId)
      ids.value = next
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.value.id)
        .eq('recipe_id', recipeId)
    } else {
      next.add(recipeId)
      ids.value = next
      await supabase
        .from('favorites')
        .insert({ user_id: user.value.id, recipe_id: recipeId })
    }
  }

  return { ids, load, isFavorite, toggleFavorite }
}
