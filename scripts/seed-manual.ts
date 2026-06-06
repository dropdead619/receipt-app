/**
 * Заливка рукописных рецептов из scripts/recipes-data.ts в Supabase.
 * КБЖУ считается из граммовки по USDA (USDA_API_KEY) — Anthropic-ключ НЕ нужен.
 *
 * Запуск: pnpm seed:manual
 * Требует в .env: SUPABASE_URL, NUXT_SUPABASE_SECRET_KEY, USDA_API_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { persistRecipe } from '../server/utils/persistRecipe'
import { RECIPES } from './recipes-data'
import { RECIPES_2 } from './recipes-data-2'

const ALL = [...RECIPES, ...RECIPES_2]

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.NUXT_SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / NUXT_SUPABASE_SECRET_KEY не заданы')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Чистим прошлый сид (recipe_ingredients снимется каскадом за recipes).
  // ingredients тоже сбрасываем, чтобы пересчитать КБЖУ с нуля.
  console.log('Очищаю прошлые рецепты…')
  await supabase.from('recipes').delete().not('id', 'is', null)
  const { error: ingErr } = await supabase.from('ingredients').delete().not('id', 'is', null)
  if (ingErr) console.warn('  ingredients не полностью очищены:', ingErr.message)

  console.log(`Заливаю ${ALL.length} рецептов (КБЖУ по USDA)…\n`)
  let ok = 0
  let unverified = 0
  for (let i = 0; i < ALL.length; i++) {
    const r = ALL[i]!
    try {
      const res = await persistRecipe(supabase, r)
      ok++
      if (!res.verified) unverified++
      console.log(
        `[${i + 1}/${ALL.length}] ${res.verified ? '✓' : '⚠'} ${r.title}` +
          (res.unresolved.length ? `  — не нашлось в USDA: ${res.unresolved.join(', ')}` : ''),
      )
    } catch (e) {
      console.error(`[${i + 1}/${ALL.length}] ✗ ${r.title}: ${(e as Error).message}`)
    }
  }
  console.log(`\nГотово: ${ok} сохранено, из них ${unverified} непроверённых (КБЖУ).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
