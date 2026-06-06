<script setup lang="ts">
import {
  MEAL_LABELS,
  type HouseholdMember,
  type MealShares,
  type MealType,
} from '#shared/types'

const household = useHouseholdStore()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

await household.load()

type Draft = Partial<HouseholdMember>
const drafts = ref<Draft[]>([])

function defaultMember(name: string): Draft {
  return {
    name,
    sex: 'male',
    age: 30,
    height_cm: 175,
    weight_kg: 70,
    activity_level: 'moderate',
    goal: 'maintain',
    is_manual_override: false,
    target_kcal: 0,
    target_protein: 0,
    target_fat: 0,
    target_carb: 0,
  }
}

// Инициализация: существующие участники или два пустых по умолчанию
function initDrafts() {
  if (household.members.length) {
    drafts.value = household.members.map((m) => ({ ...m }))
  } else {
    drafts.value = [defaultMember('Взрослый 1'), defaultMember('Взрослый 2')]
  }
}
initDrafts()

async function saveMember(i: number) {
  const saved = await household.saveMember(drafts.value[i]!)
  if (saved) drafts.value[i] = { ...(saved as HouseholdMember) }
}

async function removeMember(i: number) {
  const d = drafts.value[i]!
  if (d.id) await household.removeMember(d.id)
  drafts.value.splice(i, 1)
}

function addMember() {
  drafts.value.push(defaultMember(`Взрослый ${drafts.value.length + 1}`))
}

// ── Доли приёмов пищи ──
const meals = Object.keys(MEAL_LABELS) as MealType[]
const sharesPct = ref<Record<MealType, number>>({
  breakfast: Math.round(household.shares.breakfast * 100),
  lunch: Math.round(household.shares.lunch * 100),
  dinner: Math.round(household.shares.dinner * 100),
  snack: Math.round(household.shares.snack * 100),
})
const sharesTotal = computed(() =>
  meals.reduce((s, m) => s + (sharesPct.value[m] || 0), 0),
)
async function saveShares() {
  const total = sharesTotal.value || 1
  const next = {} as MealShares
  for (const m of meals) next[m] = (sharesPct.value[m] || 0) / total
  await household.saveShares(next)
}

async function logout() {
  await supabase.auth.signOut()
  navigateTo('/auth/login', { replace: true })
}
</script>

<template>
  <div class="px-4 pt-safe">
    <header class="flex items-center justify-between pt-4">
      <div>
        <h1 class="text-2xl font-extrabold text-sand-900">Профиль</h1>
        <p class="text-sm text-sand-500">{{ user?.email }}</p>
      </div>
      <button class="btn-ghost px-3 py-2 text-sm" @click="logout">Выйти</button>
    </header>

    <h2 class="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-sand-500">
      Взрослые ({{ drafts.length }})
    </h2>

    <div class="space-y-4">
      <MemberEditor
        v-for="(d, i) in drafts"
        :key="d.id ?? i"
        v-model="drafts[i]"
        @save="saveMember(i)"
        @remove="removeMember(i)"
      />
    </div>

    <button class="btn-ghost mt-4 w-full" @click="addMember">
      <AppIcon name="plus" class="size-5" /> Добавить взрослого
    </button>

    <!-- Доли приёмов пищи -->
    <h2 class="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-sand-500">
      Распределение по приёмам пищи
    </h2>
    <div class="card space-y-3 p-4">
      <div v-for="m in meals" :key="m" class="flex items-center gap-3">
        <span class="w-24 text-sm font-medium text-sand-700">{{ MEAL_LABELS[m] }}</span>
        <input
          v-model.number="sharesPct[m]"
          type="range"
          min="0"
          max="60"
          step="5"
          class="flex-1 accent-brand-500"
        />
        <span class="w-10 text-right text-sm font-semibold tabular-nums text-sand-900">
          {{ sharesPct[m] }}%
        </span>
      </div>
      <div
        class="flex items-center justify-between border-t border-sand-100 pt-3 text-sm"
        :class="sharesTotal === 100 ? 'text-emerald-600' : 'text-amber-600'"
      >
        <span class="font-medium">Сумма</span>
        <span class="font-bold tabular-nums">{{ sharesTotal }}%</span>
      </div>
      <button class="btn-primary w-full" @click="saveShares">Сохранить распределение</button>
    </div>

    <div class="h-6" />
  </div>
</template>
