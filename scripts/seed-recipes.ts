/**
 * Батч-генерация библиотеки рецептов в Supabase.
 * Запуск: npm run seed -- [количество]   (по умолчанию 40)
 *
 * Требует в .env: SUPABASE_URL, NUXT_SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY, USDA_API_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { generateRecipe } from '../server/utils/anthropic'
import { persistRecipe } from '../server/utils/persistRecipe'

const CUISINES = [
  'russian', 'italian', 'indian', 'korean', 'georgian',
  'japanese', 'mexican', 'mediterranean', 'thai', 'french',
] as const
const CATEGORIES = [
  'breakfast', 'soup', 'salad', 'main', 'side', 'dessert', 'snack',
] as const

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.NUXT_SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / NUXT_SUPABASE_SECRET_KEY не заданы')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const count = Number(process.argv[2]) || 40
  console.log(`Генерирую ${count} рецептов…`)

  let ok = 0
  let unverified = 0
  for (let i = 0; i < count; i++) {
    const cuisine = pick(CUISINES, i)
    const category = pick(CATEGORIES, Math.floor(i / CUISINES.length) + i)
    try {
      const gen = await generateRecipe({ cuisine, category, servings: 2 })
      const res = await persistRecipe(supabase, gen)
      ok++
      if (!res.verified) unverified++
      console.log(
        `[${i + 1}/${count}] ${res.verified ? '✓' : '⚠'} ${gen.title} (${cuisine}/${category})` +
          (res.unresolved.length ? ` — не сматчено: ${res.unresolved.join(', ')}` : ''),
      )
    } catch (e) {
      console.error(`[${i + 1}/${count}] ✗ ошибка:`, (e as Error).message)
    }
  }

  console.log(`\nГотово: ${ok} сохранено, из них ${unverified} требует проверки КБЖУ.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
