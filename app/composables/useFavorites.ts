// Избранное: реактивное множество id + синхронизация с Supabase.
export function useFavorites() {
  const supabase = useSupabaseClient()
  const ids = useState<Set<string>>('favorite-ids', () => new Set())
  const loaded = useState<boolean>('favorites-loaded', () => false)

  async function load(force = false) {
    const uid = currentUserId()
    if (!uid || (loaded.value && !force)) return
    const { data } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', uid)
    ids.value = new Set((data ?? []).map((r: { recipe_id: string }) => r.recipe_id))
    loaded.value = true
  }

  const isFavorite = (recipeId: string) => ids.value.has(recipeId)

  async function toggleFavorite(recipeId: string) {
    const uid = currentUserId()
    if (!uid) {
      return navigateTo('/auth/login')
    }
    // Оптимистичное обновление с откатом при ошибке записи
    const prev = ids.value
    const next = new Set(prev)
    const removing = next.has(recipeId)
    if (removing) next.delete(recipeId)
    else next.add(recipeId)
    ids.value = next

    const { error } = removing
      ? await supabase
          .from('favorites')
          .delete()
          .eq('user_id', uid)
          .eq('recipe_id', recipeId)
      : await supabase
          .from('favorites')
          .insert({ user_id: uid, recipe_id: recipeId })
    if (error) ids.value = prev
  }

  return { ids, load, isFavorite, toggleFavorite }
}
