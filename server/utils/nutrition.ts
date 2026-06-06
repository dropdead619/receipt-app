// Поиск нутриентов в USDA FoodData Central (per 100 g) + детерминированный пересчёт КБЖУ.

export interface Per100g {
  kcal_100g: number
  protein_100g: number
  fat_100g: number
  carb_100g: number
  source_ref: string | null
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/ё/g, 'е')
}

const cache = new Map<string, Per100g | null>()

// Номера нутриентов USDA: 203 — белок, 204 — жир, 205 — углеводы.
// Энергия: 208 (kcal) в SR Legacy; у Foundation Foods бывает только Atwater —
// 957 (general) / 958 (specific). Берём первый положительный.
const NUTRIENT = { protein: '203', fat: '204', carb: '205' } as const
const ENERGY_NUMS = ['208', '957', '958']

export async function lookupNutrition(nameEn: string): Promise<Per100g | null> {
  const key = nameEn.trim().toLowerCase()
  if (cache.has(key)) return cache.get(key)!

  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY'
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}` +
    `&query=${encodeURIComponent(nameEn)}` +
    `&pageSize=10&dataType=${encodeURIComponent('Foundation,SR Legacy')}`

  let result: Per100g | null = null
  try {
    const res = await fetch(url)
    if (res.ok) {
      const data = (await res.json()) as {
        foods?: Array<{
          fdcId: number
          foodNutrients?: Array<{ nutrientNumber?: string; value?: number }>
        }>
      }
      // Берём первый продукт, у которого есть положительная калорийность
      // (первый по релевантности иногда без энергии).
      for (const food of data.foods ?? []) {
        if (!food.foodNutrients) continue
        const get = (num: string) =>
          food.foodNutrients!.find((n) => n.nutrientNumber === num)?.value ?? 0
        const kcal = ENERGY_NUMS.map(get).find((v) => v > 0) ?? 0
        if (kcal > 0) {
          result = {
            kcal_100g: kcal,
            protein_100g: get(NUTRIENT.protein),
            fat_100g: get(NUTRIENT.fat),
            carb_100g: get(NUTRIENT.carb),
            source_ref: `usda:${food.fdcId}`,
          }
          break
        }
      }
    }
  } catch {
    result = null
  }

  cache.set(key, result)
  return result
}

export interface ComputedMacros {
  kcal: number
  protein: number
  fat: number
  carb: number
}

/** Сумма КБЖУ по списку (граммовка × per-100g). */
export function sumMacros(
  items: Array<{ grams: number; per100: Per100g }>,
): ComputedMacros {
  const total = items.reduce(
    (acc, { grams, per100 }) => {
      const f = grams / 100
      acc.kcal += per100.kcal_100g * f
      acc.protein += per100.protein_100g * f
      acc.fat += per100.fat_100g * f
      acc.carb += per100.carb_100g * f
      return acc
    },
    { kcal: 0, protein: 0, fat: 0, carb: 0 },
  )
  return {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein),
    fat: Math.round(total.fat),
    carb: Math.round(total.carb),
  }
}

export function slugify(title: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
    т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ё: 'e',
  }
  const base = title
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  // суффикс для уникальности добавляем на уровне вставки
  return base || 'recipe'
}
