<script setup lang="ts">
const route = useRoute()

const items = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/cook', label: 'Готовить', icon: 'pan' },
  { to: '/menu', label: 'Меню', icon: 'calendar' },
  { to: '/favorites', label: 'Избранное', icon: 'heart' },
  { to: '/profile', label: 'Профиль', icon: 'user' },
] as const

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 pb-safe backdrop-blur"
  >
    <ul class="mx-auto flex max-w-md items-stretch justify-around px-2">
      <li v-for="item in items" :key="item.to" class="flex-1">
        <NuxtLink
          :to="item.to"
          class="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition"
          :class="isActive(item.to) ? 'text-brand-600' : 'text-sand-500'"
        >
          <AppIcon :name="item.icon" class="size-6" />
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
