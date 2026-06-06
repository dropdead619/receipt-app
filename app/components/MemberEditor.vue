<script setup lang="ts">
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  type ActivityLevel,
  type Goal,
  type HouseholdMember,
  type Sex,
} from '#shared/types'
import { computeMemberTargets } from '~/composables/useNutrition'

const model = defineModel<Partial<HouseholdMember>>({ required: true })
const emit = defineEmits<{ save: []; remove: [] }>()

const saving = ref(false)

// Авторасчёт КБЖУ из антропометрии
const computed_ = computed(() =>
  computeMemberTargets({
    sex: (model.value.sex ?? 'male') as Sex,
    weight_kg: model.value.weight_kg ?? 70,
    height_cm: model.value.height_cm ?? 175,
    age: model.value.age ?? 30,
    activity_level: (model.value.activity_level ?? 'moderate') as ActivityLevel,
    goal: (model.value.goal ?? 'maintain') as Goal,
  }),
)

// Пока не задано вручную — синхронизируем целевые значения с расчётом
watchEffect(() => {
  if (!model.value.is_manual_override) {
    model.value.target_kcal = computed_.value.kcal
    model.value.target_protein = computed_.value.protein
    model.value.target_fat = computed_.value.fat
    model.value.target_carb = computed_.value.carb
  }
})

const sexes: { value: Sex; label: string }[] = [
  { value: 'male', label: 'М' },
  { value: 'female', label: 'Ж' },
]
const goals = Object.entries(GOAL_LABELS) as [Goal, string][]
const activities = Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]

async function onSave() {
  saving.value = true
  try {
    emit('save')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="card space-y-4 p-4">
    <div class="flex items-center gap-3">
      <input
        v-model="model.name"
        placeholder="Имя"
        class="input flex-1 font-semibold"
      />
      <button
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-sand-100 text-sand-500 active:scale-90"
        aria-label="Удалить"
        @click="emit('remove')"
      >
        <AppIcon name="trash" class="size-5" />
      </button>
    </div>

    <!-- Пол + цель -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-sand-500">Пол</label>
        <div class="grid grid-cols-2 gap-1 rounded-xl bg-sand-100 p-1">
          <button
            v-for="s in sexes"
            :key="s.value"
            class="rounded-lg py-2 text-sm font-semibold transition"
            :class="model.sex === s.value ? 'bg-white text-sand-900 shadow-sm' : 'text-sand-500'"
            @click="model.sex = s.value"
          >
            {{ s.label }}
          </button>
        </div>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-sand-500">Цель</label>
        <select v-model="model.goal" class="input py-2.5">
          <option v-for="[v, l] in goals" :key="v" :value="v">{{ l }}</option>
        </select>
      </div>
    </div>

    <!-- Возраст / рост / вес -->
    <div class="grid grid-cols-3 gap-3">
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-sand-500">Возраст</span>
        <input v-model.number="model.age" type="number" min="1" max="120" class="input py-2.5" />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-sand-500">Рост, см</span>
        <input v-model.number="model.height_cm" type="number" min="50" max="250" class="input py-2.5" />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-sand-500">Вес, кг</span>
        <input v-model.number="model.weight_kg" type="number" min="20" max="400" class="input py-2.5" />
      </label>
    </div>

    <!-- Активность -->
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-sand-500">Активность</span>
      <select v-model="model.activity_level" class="input py-2.5">
        <option v-for="[v, l] in activities" :key="v" :value="v">{{ l }}</option>
      </select>
    </label>

    <!-- Норма КБЖУ -->
    <div class="rounded-xl bg-brand-50 p-3">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold text-brand-800">Дневная норма</span>
        <label class="flex items-center gap-2 text-xs font-medium text-sand-600">
          Задать вручную
          <input v-model="model.is_manual_override" type="checkbox" class="size-4 accent-brand-500" />
        </label>
      </div>

      <div v-if="!model.is_manual_override">
        <NutritionBadge
          size="lg"
          :macros="{
            kcal: model.target_kcal,
            protein: model.target_protein,
            fat: model.target_fat,
            carb: model.target_carb,
          }"
        />
      </div>
      <div v-else class="grid grid-cols-4 gap-2">
        <label class="block">
          <span class="text-[10px] text-sand-500">ккал</span>
          <input v-model.number="model.target_kcal" type="number" class="input px-2 py-1.5 text-sm" />
        </label>
        <label class="block">
          <span class="text-[10px] text-sand-500">Б</span>
          <input v-model.number="model.target_protein" type="number" class="input px-2 py-1.5 text-sm" />
        </label>
        <label class="block">
          <span class="text-[10px] text-sand-500">Ж</span>
          <input v-model.number="model.target_fat" type="number" class="input px-2 py-1.5 text-sm" />
        </label>
        <label class="block">
          <span class="text-[10px] text-sand-500">У</span>
          <input v-model.number="model.target_carb" type="number" class="input px-2 py-1.5 text-sm" />
        </label>
      </div>
    </div>

    <button class="btn-primary w-full" :disabled="saving" @click="onSave">
      {{ saving ? 'Сохранение…' : 'Сохранить' }}
    </button>
  </div>
</template>
