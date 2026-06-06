<script setup lang="ts">
import type { Recipe } from '#shared/types'

const emit = defineEmits<{ select: [recipe: Recipe]; close: [] }>()

const { list } = useRecipes()
const search = ref('')
const recipes = ref<Recipe[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  recipes.value = await list({ search: search.value.trim() })
  loading.value = false
}
watchDebounced(search, load, { debounce: 300 })
onMounted(load)
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" @click.self="emit('close')">
    <div class="mx-auto flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-3xl bg-sand-50">
      <div class="flex items-center justify-between p-4">
        <h2 class="text-lg font-bold text-sand-900">Выберите рецепт</h2>
        <button class="grid size-9 place-items-center rounded-full bg-sand-100" @click="emit('close')">
          <AppIcon name="x" class="size-5 text-sand-600" />
        </button>
      </div>

      <div class="px-4">
        <div class="relative">
          <AppIcon
            name="search"
            class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-sand-400"
          />
          <input v-model="search" type="search" placeholder="Поиск…" class="input pl-10" />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <p v-if="loading" class="py-8 text-center text-sand-400">Загрузка…</p>
        <ul v-else-if="recipes.length" class="space-y-2">
          <li
            v-for="r in recipes"
            :key="r.id"
            class="card flex cursor-pointer items-center gap-3 p-2 active:bg-sand-100"
            @click="emit('select', r)"
          >
            <div class="size-14 shrink-0 overflow-hidden rounded-lg bg-sand-100">
              <img v-if="r.image_url" :src="r.image_url" :alt="r.title" class="size-full object-cover" />
              <div v-else class="flex size-full items-center justify-center text-sand-300">
                <AppIcon name="pan" class="size-6" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="line-clamp-1 font-semibold text-sand-900">{{ r.title }}</h3>
              <NutritionBadge size="sm" :macros="{ kcal: r.kcal_per_serving }" />
            </div>
          </li>
        </ul>
        <p v-else class="py-8 text-center text-sand-400">Ничего не найдено</p>
      </div>
    </div>
  </div>
</template>
