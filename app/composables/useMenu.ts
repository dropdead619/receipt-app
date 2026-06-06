import type { MealType, Recipe } from '#shared/types'

export interface MenuEntry {
  id: string
  day_of_week: number
  meal_type: MealType
  recipe_id: string
  servings: number
  recipe?: Recipe
}

/** Понедельник недели, содержащей дату (локально), в формате YYYY-MM-DD. */
export function mondayOf(date: Date): string {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // 0 = понедельник
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + delta * 7)
  return mondayOf(d)
}

export function useMenu() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  async function getOrCreateWeek(weekStart: string): Promise<string | null> {
    if (!user.value) return null
    const { data: existing } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('user_id', user.value.id)
      .eq('week_start_date', weekStart)
      .maybeSingle()
    if (existing) return existing.id

    const { data: created, error } = await supabase
      .from('weekly_menus')
      .insert({ user_id: user.value.id, week_start_date: weekStart })
      .select('id')
      .single()
    if (error) throw error
    return created.id
  }

  async function loadEntries(menuId: string): Promise<MenuEntry[]> {
    const { data } = await supabase
      .from('menu_entries')
      .select('id, day_of_week, meal_type, recipe_id, servings, recipes(*)')
      .eq('menu_id', menuId)
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      day_of_week: r.day_of_week as number,
      meal_type: r.meal_type as MealType,
      recipe_id: r.recipe_id as string,
      servings: Number(r.servings),
      recipe: r.recipes as Recipe | undefined,
    }))
  }

  async function setEntry(
    menuId: string,
    day: number,
    meal: MealType,
    recipeId: string,
    servings: number,
  ) {
    await supabase.from('menu_entries').upsert(
      {
        menu_id: menuId,
        day_of_week: day,
        meal_type: meal,
        recipe_id: recipeId,
        servings,
      },
      { onConflict: 'menu_id,day_of_week,meal_type' },
    )
  }

  async function removeEntry(menuId: string, day: number, meal: MealType) {
    await supabase
      .from('menu_entries')
      .delete()
      .eq('menu_id', menuId)
      .eq('day_of_week', day)
      .eq('meal_type', meal)
  }

  return { getOrCreateWeek, loadEntries, setEntry, removeEntry }
}
