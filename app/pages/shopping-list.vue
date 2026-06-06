<script setup lang="ts">
import type { ShoppingListItem } from '~/composables/useShoppingList'

const { list, toggle, remove, clearChecked } = useShoppingList()

const { data: items, refresh } = await useAsyncData<ShoppingListItem[]>(
  'shopping-list',
  () => list(),
  { default: () => [] },
)

const total = computed(() => items.value?.length ?? 0)
const done = computed(() => (items.value ?? []).filter((i) => i.checked).length)

async function onToggle(item: ShoppingListItem) {
  item.checked = !item.checked
  await toggle(item.id, item.checked)
}

async function onRemove(id: string) {
  await remove(id)
  await refresh()
}

async function onClear() {
  await clearChecked()
  await refresh()
}
</script>

<template>
  <div class="px-4 pt-safe">
    <header class="flex items-end justify-between pt-4">
      <div>
        <h1 class="text-2xl font-extrabold text-sand-900">Список закупа</h1>
        <p class="text-sm text-sand-500">Куплено {{ done }} из {{ total }}</p>
      </div>
      <button v-if="done > 0" class="btn-ghost px-3 py-2 text-sm" @click="onClear">
        Очистить купленное
      </button>
    </header>

    <!-- Прогресс -->
    <div v-if="total" class="mt-3 h-2 overflow-hidden rounded-full bg-sand-200">
      <div
        class="h-full rounded-full bg-brand-500 transition-all"
        :style="{ width: `${total ? (done / total) * 100 : 0}%` }"
      />
    </div>

    <ul v-if="items && items.length" class="mt-4 card divide-y divide-sand-100">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-3 px-4 py-3"
      >
        <input
          type="checkbox"
          class="size-5 rounded accent-brand-500"
          :checked="item.checked"
          @change="onToggle(item)"
        />
        <span
          class="flex-1 text-sand-800"
          :class="{ 'text-sand-400 line-through': item.checked }"
        >
          {{ item.name ?? 'Продукт' }}
        </span>
        <span v-if="item.grams" class="text-sm text-sand-400">{{ item.grams }} г</span>
        <button class="text-sand-300 active:scale-90" @click="onRemove(item.id)">
          <AppIcon name="trash" class="size-5" />
        </button>
      </li>
    </ul>

    <EmptyState
      v-else
      icon="basket"
      title="Список пуст"
      text="Отмечайте недостающие продукты в рекомендациях или рецептах."
    >
      <NuxtLink to="/recommended" class="btn-ghost mt-4">К рекомендациям</NuxtLink>
    </EmptyState>
  </div>
</template>
