/**
 * Полная очистка библиотеки рецептов.
 * Запуск: npm run clear:recipes
 *
 * Удаляет все рецепты; recipe_ingredients, favorites и menu_entries
 * удаляются каскадом, у shopping_list_items обнуляется source_recipe_id.
 * Справочник ингредиентов не трогаем — на него ссылаются кладовая и закуп.
 *
 * Требует в .env: SUPABASE_URL, NUXT_SUPABASE_SECRET_KEY.
 */
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.NUXT_SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / NUXT_SUPABASE_SECRET_KEY не заданы')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { count: before, error: countErr } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
  if (countErr) throw countErr

  const { error } = await supabase
    .from('recipes')
    .delete()
    .not('id', 'is', null)
  if (error) throw error

  console.log(`Удалено рецептов: ${before ?? 0}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
