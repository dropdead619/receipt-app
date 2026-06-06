<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  text?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div class="grid size-16 place-items-center rounded-2xl bg-sand-100 text-sand-400">
      <AppIcon :name="icon ?? 'sparkles'" class="size-8" />
    </div>
    <h3 class="mt-4 text-base font-bold text-sand-800">{{ title }}</h3>
    <p v-if="text" class="mt-1 max-w-xs text-sm text-sand-500">{{ text }}</p>
    <slot />
  </div>
</template>
