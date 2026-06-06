import type {
  ActivityLevel,
  Goal,
  HouseholdMember,
  Macros,
  MealShares,
  MealType,
  Recipe,
  RecipeIngredient,
  Sex,
} from '#shared/types'

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_FACTORS: Record<Goal, number> = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
}

/** Базовый обмен (Mifflin–St Jeor). */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/** Дневная норма калорий с учётом активности и цели. */
export function targetKcal(member: Pick<
  HouseholdMember,
  'sex' | 'weight_kg' | 'height_cm' | 'age' | 'activity_level' | 'goal'
>): number {
  const value =
    bmr(member.sex, member.weight_kg, member.height_cm, member.age) *
    ACTIVITY_FACTORS[member.activity_level] *
    GOAL_FACTORS[member.goal]
  return Math.round(value)
}

/**
 * Распределение калорий по БЖУ (г).
 * Белок 1.8 г/кг, жир 25% калорий, остальное — углеводы.
 */
export function targetMacros(
  kcal: number,
  weightKg: number,
): Macros {
  const protein = Math.round(1.8 * weightKg)
  const fat = Math.round((kcal * 0.25) / 9)
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, fat, carb }
}

/** Полный расчёт норм для участника (если не задано вручную). */
export function computeMemberTargets(
  member: Pick<
    HouseholdMember,
    'sex' | 'weight_kg' | 'height_cm' | 'age' | 'activity_level' | 'goal'
  >,
): Macros {
  const kcal = targetKcal(member)
  return targetMacros(kcal, member.weight_kg)
}

export interface ScaledPortion {
  member: HouseholdMember
  multiplier: number
  macros: Macros
}

export interface ScaledRecipe {
  /** Сколько порций рецепта суммарно готовить на всех. */
  totalServings: number
  /** Порция на каждого участника. */
  portions: ScaledPortion[]
  /** Ингредиенты с граммовкой, пересчитанной под суммарный объём. */
  ingredients: RecipeIngredient[]
  /** Суммарный КБЖУ блюда «к готовке». */
  total: Macros
}

function recipeServingMacros(recipe: Recipe): Macros {
  return {
    kcal: recipe.kcal_per_serving,
    protein: recipe.protein_per_serving,
    fat: recipe.fat_per_serving,
    carb: recipe.carb_per_serving,
  }
}

/**
 * Адаптирует рецепт под участников домохозяйства с разным каллоражем.
 * Для каждого участника множитель порции = целевые ккал приёма / ккал порции рецепта.
 */
export function scaleRecipe(
  recipe: Recipe,
  members: HouseholdMember[],
  meal: MealType,
  shares: MealShares,
): ScaledRecipe {
  const perServing = recipeServingMacros(recipe)
  const share = shares[meal]

  const portions: ScaledPortion[] = members.map((member) => {
    const mealKcal = member.target_kcal * share
    const multiplier = perServing.kcal > 0 ? mealKcal / perServing.kcal : 1
    return {
      member,
      multiplier,
      macros: {
        kcal: Math.round(perServing.kcal * multiplier),
        protein: Math.round(perServing.protein * multiplier),
        fat: Math.round(perServing.fat * multiplier),
        carb: Math.round(perServing.carb * multiplier),
      },
    }
  })

  const totalMultiplier = portions.reduce((s, p) => s + p.multiplier, 0)
  const totalServings = totalMultiplier // в «порциях рецепта»
  const ingredientScale = totalMultiplier / recipe.base_servings

  const ingredients: RecipeIngredient[] = (recipe.ingredients ?? []).map((ing) => ({
    ...ing,
    grams: Math.round(ing.grams * ingredientScale),
  }))

  const total: Macros = portions.reduce(
    (acc, p) => ({
      kcal: acc.kcal + p.macros.kcal,
      protein: acc.protein + p.macros.protein,
      fat: acc.fat + p.macros.fat,
      carb: acc.carb + p.macros.carb,
    }),
    { kcal: 0, protein: 0, fat: 0, carb: 0 },
  )

  return { totalServings, portions, ingredients, total }
}
