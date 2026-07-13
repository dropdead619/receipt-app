// Доменные типы, общие для клиента и сервера (Nuxt 4 auto-imports из shared/).

export type Cuisine =
  | 'russian'
  | 'italian'
  | 'indian'
  | 'korean'
  | 'georgian'
  | 'japanese'
  | 'mexican'
  | 'mediterranean'
  | 'thai'
  | 'french'

export type Category =
  | 'breakfast'
  | 'soup'
  | 'salad'
  | 'main'
  | 'side'
  | 'dessert'
  | 'snack'
  | 'drink'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type Sex = 'male' | 'female'

export type Goal = 'lose' | 'maintain' | 'gain'

// Уровни активности → коэффициент TDEE
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export interface Macros {
  kcal: number
  protein: number
  fat: number
  carb: number
}

export interface Ingredient {
  id: string
  name: string
  name_normalized: string
  kcal_100g: number
  protein_100g: number
  fat_100g: number
  carb_100g: number
  source_ref: string | null
}

export interface RecipeIngredient {
  ingredient_id: string
  name: string
  grams: number
  display_text: string
  is_optional: boolean
}

export interface Recipe {
  id: string
  slug: string
  title: string
  description: string | null
  cuisine: Cuisine | null
  category: Category
  base_servings: number
  time_minutes: number
  kcal_per_serving: number
  protein_per_serving: number
  fat_per_serving: number
  carb_per_serving: number
  steps: string[]
  image_url: string | null
  source: 'ai' | 'manual'
  verified: boolean
  created_at: string
  ingredients?: RecipeIngredient[]
}

export interface HouseholdMember {
  id: string
  user_id: string
  name: string
  sex: Sex
  age: number
  height_cm: number
  weight_kg: number
  activity_level: ActivityLevel
  goal: Goal
  target_kcal: number
  target_protein: number
  target_fat: number
  target_carb: number
  is_manual_override: boolean
}

// Доли приёмов пищи от дневной нормы
export type MealShares = Record<MealType, number>

export const DEFAULT_MEAL_SHARES: MealShares = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
}

export const CUISINE_LABELS: Record<Cuisine, string> = {
  russian: 'Русская',
  italian: 'Итальянская',
  indian: 'Индийская',
  korean: 'Корейская',
  georgian: 'Грузинская',
  japanese: 'Японская',
  mexican: 'Мексиканская',
  mediterranean: 'Средиземноморская',
  thai: 'Тайская',
  french: 'Французская',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  breakfast: 'Завтраки',
  soup: 'Супы',
  salad: 'Салаты',
  main: 'Основные',
  side: 'Гарниры',
  dessert: 'Десерты',
  snack: 'Перекусы',
  drink: 'Напитки',
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Минимальная',
  light: 'Лёгкая',
  moderate: 'Средняя',
  active: 'Высокая',
  very_active: 'Очень высокая',
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Похудение',
  maintain: 'Поддержание',
  gain: 'Набор',
}
