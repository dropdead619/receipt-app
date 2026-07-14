<script setup lang="ts">
// Лёгкий набор иконок (Lucide-стиль), stroke-based.
const props = defineProps<{ name: string }>()

const paths: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  pan: 'M3 12h13a4 4 0 0 1 0 8H8a5 5 0 0 1-5-5v-3Zm13 0 5-3M9 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2',
  calendar: 'M4 7h16v13H4zM4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M8 3v4M16 3v4M4 11h16',
  heart: 'M12 20s-7-4.4-9.3-8.2C1.1 9 2 5.7 5 5c2-.5 3.5.5 4.5 2 1-1.5 2.5-2.5 4.5-2 3 .7 3.9 4 2.3 6.8C19 15.6 12 20 12 20Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-3.3 3.6-6 8-6s8 2.7 8 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  check: 'M5 13l4 4L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  pencil: 'M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 3 21l.5-4.5L17 3Z',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14',
  sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3ZM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  cart: 'M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  basket: 'M5 9h14l-1.5 11H6.5L5 9ZM9 9 12 3l3 6M3 9h18',
  google: 'M21 12.2c0-.6 0-1.2-.2-1.8H12v3.5h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.8-4.2 2.8-7Z',
}
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[props.name] ?? paths.x" />
  </svg>
</template>
