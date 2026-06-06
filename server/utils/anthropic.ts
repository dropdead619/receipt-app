import Anthropic from '@anthropic-ai/sdk'
import type { Category, Cuisine } from '#shared/types'

// Модель по умолчанию — самая способная. Для дешёвой батч-генерации сида
// можно переключить через RECIPE_MODEL (например claude-haiku-4-5).
const MODEL = process.env.RECIPE_MODEL || 'claude-opus-4-8'

let client: Anthropic | null = null
export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY не задан')
    client = new Anthropic({ apiKey })
  }
  return client
}

export interface GeneratedIngredient {
  /** Название по-русски для отображения */
  name: string
  /** Каноническое английское название для поиска нутриентов (USDA) */
  name_en: string
  /** Количество в граммах (для расчётов) */
  grams: number
  /** Человекочитаемое количество, напр. «2 яйца» */
  display_text: string
  is_optional: boolean
}

export interface GeneratedRecipe {
  title: string
  description: string
  cuisine: Cuisine
  category: Category
  base_servings: number
  time_minutes: number
  ingredients: GeneratedIngredient[]
  steps: string[]
}

// JSON-schema под structured outputs (без неподдерживаемых ограничений длины/диапазона).
const RECIPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    cuisine: {
      type: 'string',
      enum: [
        'russian', 'italian', 'indian', 'korean', 'georgian',
        'japanese', 'mexican', 'mediterranean', 'thai', 'french',
      ],
    },
    category: {
      type: 'string',
      enum: ['breakfast', 'soup', 'salad', 'main', 'side', 'dessert', 'snack', 'drink'],
    },
    base_servings: { type: 'integer' },
    time_minutes: { type: 'integer' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          name_en: { type: 'string' },
          grams: { type: 'number' },
          display_text: { type: 'string' },
          is_optional: { type: 'boolean' },
        },
        required: ['name', 'name_en', 'grams', 'display_text', 'is_optional'],
      },
    },
    steps: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'title', 'description', 'cuisine', 'category',
    'base_servings', 'time_minutes', 'ingredients', 'steps',
  ],
} as const

const SYSTEM = `Ты — шеф-повар и нутрициолог. Генерируешь рецепты на русском языке в строгом JSON.
Требования:
- Все тексты (title, description, display_text, steps) — на русском.
- Для каждого ингредиента укажи name (рус.), name_en (точное каноническое английское название продукта для поиска в базе нутриентов USDA, напр. "chicken breast, raw", "olive oil", "white rice, raw"), grams (вес съедобной части в граммах) и display_text (бытовое количество, напр. "2 яйца", "1 ст. л.").
- grams должны быть реалистичными для base_servings порций.
- Помечай is_optional=true только для необязательных ингредиентов (специи по вкусу, украшение).
- steps — понятные пошаговые инструкции.`

export interface GenerateParams {
  cuisine?: Cuisine
  category?: Category
  prompt?: string
  servings?: number
}

export async function generateRecipe(params: GenerateParams): Promise<GeneratedRecipe> {
  const anthropic = getAnthropic()
  const constraints = [
    params.cuisine ? `Кухня: ${params.cuisine}.` : '',
    params.category ? `Категория: ${params.category}.` : '',
    `Порций по умолчанию: ${params.servings ?? 2}.`,
    params.prompt ? `Пожелание: ${params.prompt}` : 'Придумай вкусный рецепт.',
  ]
    .filter(Boolean)
    .join(' ')

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: {
      format: { type: 'json_schema', schema: RECIPE_SCHEMA },
      effort: 'low',
    },
    messages: [{ role: 'user', content: `Сгенерируй один рецепт. ${constraints}` }],
  })

  const block = message.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('Пустой ответ от модели')
  return JSON.parse(block.text) as GeneratedRecipe
}
