<script setup lang="ts">
import type { PantryItem } from '~/composables/usePantry'

const { list, add, remove, searchIngredients } = usePantry()

const { data: items, refresh } = await useAsyncData<PantryItem[]>(
  'pantry',
  () => list(),
  { default: () => [] },
)

const query = ref('')
const suggestions = ref<{ id: string; name: string }[]>([])

watchDebounced(
  query,
  async () => {
    suggestions.value = await searchIngredients(query.value)
  },
  { debounce: 250 },
)

async function addItem(ingredientId: string) {
  await add(ingredientId)
  query.value = ''
  suggestions.value = []
  await refresh()
}

async function removeItem(id: string) {
  await remove(id)
  await refresh()
}
</script>

<template>
  <div class="px-4 pt-safe">
    <header class="pt-4">
      <h1 class="text-2xl font-extrabold text-sand-900">Моя кладовая</h1>
      <p class="text-sm text-sand-500">Что есть в наличии</p>
    </header>

    <!-- Поиск/добавление -->
    <div class="relative mt-4">
      <AppIcon
        name="plus"
        class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-sand-400"
      />
      <input
        v-model="query"
        type="search"
        placeholder="Добавить продукт…"
        class="input pl-10"
      />
      <ul
        v-if="suggestions.length"
        class="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-sand-200 bg-white shadow-lg"
      >
        <li
          v-for="s in suggestions"
          :key="s.id"
          class="cursor-pointer px-4 py-2.5 text-sand-800 active:bg-sand-50"
          @click="addItem(s.id)"
        >
          {{ s.name }}
        </li>
      </ul>
    </div>

    <!-- Список продуктов -->
    <div v-if="items && items.length" class="mt-4 flex flex-wrap gap-2">
      <span
        v-for="item in items"
        :key="item.id"
        class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-sand-700 shadow-sm ring-1 ring-sand-200"
      >
        {{ item.name }}
        <button class="text-sand-400 active:scale-90" @click="removeItem(item.id)">
          <AppIcon name="x" class="size-4" />
        </button>
      </span>
    </div>

    <EmptyState
      v-else
      icon="basket"
      title="Кладовая пуста"
      text="Добавьте продукты, которые есть дома, — подберём, что приготовить."
    />

    <NuxtLink v-if="items && items.length" to="/cook" class="btn-primary mt-6 w-full">
      <AppIcon name="pan" class="size-5" /> Что приготовить из этого →
    </NuxtLink>
  </div>
</template>
