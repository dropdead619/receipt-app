import { defineStore } from 'pinia'
import {
  DEFAULT_MEAL_SHARES,
  type HouseholdMember,
  type MealShares,
} from '#shared/types'

export const useHouseholdStore = defineStore('household', () => {
  const members = ref<HouseholdMember[]>([])
  const shares = ref<MealShares>({ ...DEFAULT_MEAL_SHARES })
  const loaded = ref(false)

  async function load(force = false) {
    if (loaded.value && !force) return
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    if (!user.value) return

    const [{ data: m }, { data: s }] = await Promise.all([
      supabase
        .from('household_members')
        .select('*')
        .eq('user_id', user.value.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('user_settings')
        .select('meal_shares')
        .eq('user_id', user.value.id)
        .maybeSingle(),
    ])

    members.value = (m ?? []) as unknown as HouseholdMember[]
    if (s && (s as { meal_shares?: MealShares }).meal_shares) {
      shares.value = (s as { meal_shares: MealShares }).meal_shares
    }
    loaded.value = true
  }

  async function saveMember(member: Partial<HouseholdMember>) {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    if (!user.value) throw new Error('Сессия не найдена — войдите заново')
    const payload = { ...member, user_id: user.value.id }
    const { data, error } = await supabase
      .from('household_members')
      .upsert(payload)
      .select()
      .single()
    if (error) throw error
    await load(true)
    return data
  }

  async function removeMember(id: string) {
    const supabase = useSupabaseClient()
    await supabase.from('household_members').delete().eq('id', id)
    members.value = members.value.filter((m) => m.id !== id)
  }

  async function saveShares(next: MealShares) {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    if (!user.value) throw new Error('Сессия не найдена — войдите заново')
    shares.value = next
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.value.id, meal_shares: next })
    if (error) throw error
  }

  const isConfigured = computed(() => members.value.length > 0)

  return {
    members,
    shares,
    loaded,
    isConfigured,
    load,
    saveMember,
    removeMember,
    saveShares,
  }
})
