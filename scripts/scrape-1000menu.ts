/**
 * Сбор ФАКТОВ рецептов с 1000.menu (ингредиенты + граммовка + КБЖУ + категория)
 * и запись в Supabase. НЕ копирует их фото и пошаговый текст — шаги генерим свои,
 * со ссылкой на источник. Для личного использования.
 *
 * Запуск: pnpm scrape:1000menu [сколько]   (по умолчанию 100)
 * Требует в .env: SUPABASE_URL, NUXT_SUPABASE_SECRET_KEY.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { normalizeName } from '../server/utils/nutrition'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const BASE = 'https://1000.menu'
const DELAY_MS = 500 // вежливая задержка между запросами

// grams_conversion из их таблицы measures; measure_id 6 (штука) → grams_in_pce
const MEASURE_G: Record<number, number> = { 1: 1, 2: 1000, 4: 1000, 5: 1, 7: 200, 8: 5, 9: 15, 10: 10, 14: 0 }
const MEASURE_SHORT: Record<number, string> = {
  1: 'г', 2: 'кг', 4: 'л', 5: 'мл', 6: 'шт.', 7: 'стак.', 8: 'ч.л.', 9: 'ст.л.', 10: 'дес.л.', 14: 'по вкусу',
}

const CATEGORY_RULES: [RegExp, string][] = [
  [/суп|борщ|щи|похлёб|уха|рассольник|солянк|окрошк/i, 'soup'],
  [/салат|винегрет/i, 'salad'],
  [/закус|брускет|намазк|дип|паштет|хумус|канапе/i, 'snack'],
  [/десерт|торт|пирог|печень|кекс|пирожн|блин|оладь|чизкейк|шарлот|выпечк|маффин|мороженое/i, 'dessert'],
  [/напит|коктейл|смузи|компот|морс|какао|лимонад|кисель/i, 'drink'],
  [/гарнир|пюре|каша|плов(?!ная)|рагу/i, 'side'],
  [/завтрак|омлет|яичниц|сырник|гранол|каша молоч/i, 'breakfast'],
]
const CUISINE_RULES: [RegExp, string][] = [
  [/карри|масала|тикка|дал |бирьян|индийск|чана|алу /i, 'indian'],
  [/паст|пицц|ризотто|лазань|болонь|карбонар|итальянск|капрезе/i, 'italian'],
  [/кимч|бибимбап|корейск|пулькоги|токпокки|чапче/i, 'korean'],
  [/суши|рамен|терияк|мисо|японск|удон|якисоба|тамаго/i, 'japanese'],
  [/том ?ям|том ?кха|пад ?тай|тайск/i, 'thai'],
  [/тако|буррит|кесадиль|начос|мексиканск|фахит|сальса|гуакамоле/i, 'mexican'],
  [/хачапур|лобио|чахохбили|грузинск|аджап|оджахур|пхали|бадриджан/i, 'georgian'],
  [/хумус|фалафел|табуле|греческ|средиземн|гирос|шакшук/i, 'mediterranean'],
  [/рататуй|киш |крок|француз|тарт/i, 'french'],
]
function classify(rules: [RegExp, string][], text: string, def: string): string {
  for (const [re, v] of rules) if (re.test(text)) return v
  return def
}

// Мусор для приложения «еда на каждый день»: заготовки, консервация, наливки.
const BLOCK =
  /на зиму|заготовк|консерв|маринован|марино́ван|аджика|аджук|варень|джем|повидл|закатк|закрут|компот|настойк|ликёр|ликер|самогон|наливк|соленье|засолк|квашен|сироп|вино /i

// Разнородные «якоря», чтобы обход шёл по нормальным блюдам, а не по сезонным заготовкам.
const SEEDS = [
  '/cooking/109995-tomatnyi-sup-iz-pomidorov',
  '/cooking/13047-pasta-karbonara-s-bekonom-i-slivkami',
  '/cooking/17258-ratatui-iz-baklajanov',
  '/cooking/25209-sharlotka-klassicheskaya-s-yablokami-v-duxovke-pyshnaya',
  '/cooking/24712-borsch-s-botvoi-svekly',
  '/cooking/27362-tomatnyi-sup-pure-klassicheskii',
]

interface ParsedIng {
  name: string
  grams: number
  display_text: string
  kcal_100g: number
  protein_100g: number
  fat_100g: number
  carb_100g: number
  food_id: number
}
interface Parsed {
  menuId: string
  title: string
  cuisine: string
  category: string
  base_servings: number
  time_minutes: number
  ingredients: ParsedIng[]
  url: string
}

function bracketMatch(html: string, key: string): string | null {
  const s = html.indexOf(key)
  if (s < 0) return null
  let i = s + key.length - 1
  let depth = 0
  for (; i < html.length; i++) {
    const c = html[i]
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) return html.slice(s + key.length - 1, i + 1)
    }
  }
  return null
}

function parseRecipe(html: string, url: string): Parsed | null {
  const menuId = url.match(/\/cooking\/(\d+)/)?.[1] ?? ''
  const title = (html.match(/<h1[^>]*itemprop="name"[^>]*>([^<]+)/)?.[1] ?? '').trim()
  if (!title) return null

  const arrJson = bracketMatch(html, '"ingredients":[')
  if (!arrJson) return null
  let raw: any[]
  try {
    raw = JSON.parse(arrJson)
  } catch {
    return null
  }

  const ingredients: ParsedIng[] = []
  for (const it of raw) {
    if (it.measure_id === 14) continue // «по вкусу» — пропускаем
    const g =
      it.measure_id === 6
        ? (it.quantity || 0) * (it.grams_in_pce || 0)
        : (it.quantity || 0) * (MEASURE_G[it.measure_id] ?? 1)
    if (!g || g <= 0) continue
    if (!(it.calories > 0)) continue
    const short = MEASURE_SHORT[it.measure_id] ?? ''
    ingredients.push({
      name: String(it.food_name || it.value || '').trim(),
      grams: Math.round(g),
      display_text: `${it.quantity} ${short}`.trim(),
      kcal_100g: it.calories,
      protein_100g: it.proteins ?? 0,
      fat_100g: it.fats ?? 0,
      carb_100g: it.carbs ?? 0,
      food_id: it.food_id ?? 0,
    })
  }
  if (ingredients.length < 2) return null

  const servings = Math.max(1, Number(html.match(/yield_num_input'[^>]*value='(\d+)'/)?.[1] ?? 4))

  // время: itemprop totalTime (ISO 8601) либо дефолт
  const iso = html.match(/itemprop="totalTime"[^>]*content="([^"]+)"/)?.[1] ?? ''
  const tm = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  const time_minutes = tm ? (Number(tm[1] || 0) * 60 + Number(tm[2] || 0)) || 30 : 30

  // категория из хлебных крошек (предпоследний name), кухня — эвристика по названию
  const crumbs = [...html.matchAll(/itemprop="name">([^<]{2,40})</g)].map((m) => m[1])
  const crumbCat = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : ''
  const category = classify(CATEGORY_RULES, `${crumbCat} ${title}`, 'main')
  const cuisine = classify(CUISINE_RULES, title, 'russian')

  return { menuId, title, cuisine, category, base_servings: servings, time_minutes, ingredients, url }
}

async function persist(supabase: SupabaseClient, p: Parsed): Promise<'saved' | 'skip'> {
  const slug = `${p.menuId}-${normalizeName(p.title).replace(/[^a-zа-я0-9]+/gi, '-').slice(0, 50)}`
  // идемпотентность: уже есть такой рецепт?
  const { data: exist } = await supabase.from('recipes').select('id').eq('slug', slug).maybeSingle()
  if (exist) return 'skip'

  // ингредиенты в справочник (их КБЖУ на 100 г)
  const links: { ingredient_id: string; grams: number; display_text: string; is_optional: boolean }[] = []
  let totalK = 0, totalP = 0, totalF = 0, totalC = 0
  for (const ing of p.ingredients) {
    const norm = normalizeName(ing.name)
    let id: string
    const { data: found } = await supabase.from('ingredients').select('id').eq('name_normalized', norm).maybeSingle()
    if (found) id = found.id
    else {
      const { data: ins, error } = await supabase
        .from('ingredients')
        .insert({
          name: ing.name, name_normalized: norm,
          kcal_100g: ing.kcal_100g, protein_100g: ing.protein_100g,
          fat_100g: ing.fat_100g, carb_100g: ing.carb_100g,
          source_ref: `1000menu:${ing.food_id}`,
        })
        .select('id').single()
      if (error) throw error
      id = ins.id
    }
    const f = ing.grams / 100
    totalK += ing.kcal_100g * f; totalP += ing.protein_100g * f
    totalF += ing.fat_100g * f; totalC += ing.carb_100g * f
    if (!links.some((l) => l.ingredient_id === id))
      links.push({ ingredient_id: id, grams: ing.grams, display_text: ing.display_text, is_optional: false })
  }

  const s = p.base_servings
  const { data: recipe, error: rErr } = await supabase
    .from('recipes')
    .insert({
      slug, title: p.title, description: null,
      cuisine: p.cuisine, category: p.category,
      base_servings: s, time_minutes: p.time_minutes,
      kcal_per_serving: Math.round(totalK / s), protein_per_serving: Math.round(totalP / s),
      fat_per_serving: Math.round(totalF / s), carb_per_serving: Math.round(totalC / s),
      steps: [
        'Подготовьте ингредиенты по списку.',
        `Приготовьте блюдо «${p.title}» до готовности, приправив по вкусу.`,
        `Пошаговые фото и подробности: ${p.url}`,
      ],
      source: 'manual', verified: true,
    })
    .select('id').single()
  if (rErr) throw rErr
  const { error: lErr } = await supabase
    .from('recipe_ingredients')
    .insert(links.map((l) => ({ ...l, recipe_id: recipe.id })))
  if (lErr) throw lErr
  return 'saved'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.NUXT_SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / NUXT_SUPABASE_SECRET_KEY не заданы')
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const limit = Number(process.argv[2]) || 100
  console.log(`Цель: ${limit} рецептов с 1000.menu (только факты)\n`)

  // BFS «снежный ком» от главной
  const seedHtml = (await fetchHtml(`${BASE}/`)) ?? ''
  const queue = [
    ...SEEDS,
    ...new Set([...seedHtml.matchAll(/\/cooking\/\d+-[a-z0-9-]+/g)].map((m) => m[0])),
  ]
  const visited = new Set<string>()
  let saved = 0, skipped = 0, failed = 0

  while (queue.length && saved < limit) {
    const path = queue.shift()!
    if (visited.has(path)) continue
    visited.add(path)

    const html = await fetchHtml(`${BASE}${path}`)
    await sleep(DELAY_MS)
    if (!html) { failed++; continue }

    // пополняем фронтир ссылками с этой страницы
    for (const m of html.matchAll(/\/cooking\/\d+-[a-z0-9-]+/g))
      if (!visited.has(m[0])) queue.push(m[0])

    try {
      const parsed = parseRecipe(html, `${BASE}${path}`)
      if (!parsed) { failed++; continue }
      if (BLOCK.test(parsed.title)) { skipped++; continue } // заготовки/консервация — мимо
      const r = await persist(supabase, parsed)
      if (r === 'saved') {
        saved++
        console.log(`[${saved}/${limit}] ✓ ${parsed.title} (${parsed.cuisine}/${parsed.category}, ${Math.round((parsed.ingredients.reduce((a, i) => a + i.kcal_100g * i.grams / 100, 0)) / parsed.base_servings)} ккал/порц)`)
      } else skipped++
    } catch (e) {
      failed++
      console.error(`  ✗ ${path}: ${(e as Error).message}`)
    }
  }

  console.log(`\nГотово: ${saved} новых, ${skipped} уже были, ${failed} пропущено. Посещено ${visited.size} страниц.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
