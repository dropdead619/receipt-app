<script setup lang="ts">
import type { Macros } from '#shared/types'

const props = withDefaults(
  defineProps<{ macros: Partial<Macros>; size?: 'sm' | 'md' | 'lg' }>(),
  { size: 'md' },
)

const items = computed(() => [
  { key: 'kcal', label: 'ккал', value: props.macros.kcal, cls: 'text-brand-600' },
  { key: 'protein', label: 'Б', value: props.macros.protein, cls: 'text-blue-600' },
  { key: 'fat', label: 'Ж', value: props.macros.fat, cls: 'text-amber-600' },
  { key: 'carb', label: 'У', value: props.macros.carb, cls: 'text-emerald-600' },
])

const sizeCls = {
  sm: 'text-[11px] gap-2',
  md: 'text-xs gap-3',
  lg: 'text-sm gap-4',
}
</script>

<template>
  <div class="flex items-center font-semibold" :class="sizeCls[size]">
    <span
      v-for="item in items"
      :key="item.key"
      v-show="item.value != null"
      class="flex items-baseline gap-0.5"
    >
      <span :class="item.cls">{{ Math.round(item.value ?? 0) }}</span>
      <span class="text-sand-400 font-medium">{{ item.label }}</span>
    </span>
  </div>
</template>
