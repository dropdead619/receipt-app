<script setup lang="ts">
import type { Recipe } from '#shared/types'
import { CUISINE_LABELS } from '#shared/types'

const props = defineProps<{ recipe: Recipe; compact?: boolean }>()

const { isFavorite, toggleFavorite } = useFavorites()
const fav = computed(() => isFavorite(props.recipe.id))

async function onFav(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  await toggleFavorite(props.recipe.id)
}
</script>

<template>
  <NuxtLink
    :to="`/recipes/${recipe.slug}`"
    class="card group relative block overflow-hidden"
    :class="compact ? 'w-44 shrink-0' : ''"
  >
    <div class="relative aspect-[4/3] overflow-hidden bg-sand-100">
      <img
        v-if="recipe.image_url"
        :src="recipe.image_url"
        :alt="recipe.title"
        loading="lazy"
        class="size-full object-cover transition group-active:scale-105"
      />
      <div v-else class="flex size-full items-center justify-center text-sand-300">
        <AppIcon name="pan" class="size-10" />
      </div>

      <button
        type="button"
        class="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/90 backdrop-blur transition active:scale-90"
        :aria-label="fav ? 'Убрать из избранного' : 'В избранное'"
        @click="onFav"
      >
        <AppIcon
          name="heart"
          class="size-5"
          :class="fav ? 'fill-brand-500 text-brand-500' : 'text-sand-500'"
        />
      </button>

      <span
        v-if="recipe.cuisine"
        class="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur"
      >
        {{ CUISINE_LABELS[recipe.cuisine] }}
      </span>
    </div>

    <div class="space-y-1.5 p-3">
      <h3 class="line-clamp-2 text-sm font-bold leading-snug text-sand-900">
        {{ recipe.title }}
      </h3>
      <div class="flex items-center gap-1 text-xs text-sand-400">
        <AppIcon name="clock" class="size-3.5" />
        {{ recipe.time_minutes }} мин
      </div>
      <NutritionBadge
        size="sm"
        :macros="{
          kcal: recipe.kcal_per_serving,
          protein: recipe.protein_per_serving,
          fat: recipe.fat_per_serving,
          carb: recipe.carb_per_serving,
        }"
      />
    </div>
  </NuxtLink>
</template>
