// Типы БД для @nuxtjs/supabase.
// Сгенерировать актуальную версию: `supabase gen types typescript --linked > app/types/database.types.ts`
// Пока — ручная версия, синхронная со схемой в supabase/migrations.

type Cuisine =
  | 'russian' | 'italian' | 'indian' | 'korean' | 'georgian'
  | 'japanese' | 'mexican' | 'mediterranean' | 'thai' | 'french'
type Category =
  | 'breakfast' | 'soup' | 'salad' | 'main' | 'side' | 'dessert' | 'snack' | 'drink'
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type Sex = 'male' | 'female'
type Goal = 'lose' | 'maintain' | 'gain'
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
type RecipeSource = 'ai' | 'manual'

type Row<T> = T
type Insert<T> = Partial<T>
type Update<T> = Partial<T>

interface IngredientRow {
  id: string
  name: string
  name_normalized: string
  kcal_100g: number
  protein_100g: number
  fat_100g: number
  carb_100g: number
  source_ref: string | null
  created_at: string
}

interface RecipeRow {
  id: string
  slug: string
  title: string
  description: string | null
  cuisine: Cuisine
  category: Category
  base_servings: number
  time_minutes: number
  kcal_per_serving: number
  protein_per_serving: number
  fat_per_serving: number
  carb_per_serving: number
  steps: string[]
  image_url: string | null
  source: RecipeSource
  verified: boolean
  created_at: string
}

interface RecipeIngredientRow {
  recipe_id: string
  ingredient_id: string
  grams: number
  display_text: string
  is_optional: boolean
}

interface HouseholdMemberRow {
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
  created_at: string
}

interface UserSettingsRow {
  user_id: string
  meal_shares: Record<MealType, number>
  updated_at: string
}

interface FavoriteRow {
  user_id: string
  recipe_id: string
  created_at: string
}

interface PantryItemRow {
  id: string
  user_id: string
  ingredient_id: string
  quantity: number | null
  unit: string | null
  created_at: string
}

interface WeeklyMenuRow {
  id: string
  user_id: string
  week_start_date: string
  created_at: string
}

interface MenuEntryRow {
  id: string
  menu_id: string
  day_of_week: number
  meal_type: MealType
  recipe_id: string
  servings: number
}

interface ShoppingListItemRow {
  id: string
  user_id: string
  ingredient_id: string
  grams: number | null
  checked: boolean
  source_recipe_id: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      ingredients: { Row: Row<IngredientRow>; Insert: Insert<IngredientRow>; Update: Update<IngredientRow>; Relationships: [] }
      recipes: { Row: Row<RecipeRow>; Insert: Insert<RecipeRow>; Update: Update<RecipeRow>; Relationships: [] }
      recipe_ingredients: { Row: Row<RecipeIngredientRow>; Insert: Insert<RecipeIngredientRow>; Update: Update<RecipeIngredientRow>; Relationships: [] }
      household_members: { Row: Row<HouseholdMemberRow>; Insert: Insert<HouseholdMemberRow>; Update: Update<HouseholdMemberRow>; Relationships: [] }
      user_settings: { Row: Row<UserSettingsRow>; Insert: Insert<UserSettingsRow>; Update: Update<UserSettingsRow>; Relationships: [] }
      favorites: { Row: Row<FavoriteRow>; Insert: Insert<FavoriteRow>; Update: Update<FavoriteRow>; Relationships: [] }
      pantry_items: { Row: Row<PantryItemRow>; Insert: Insert<PantryItemRow>; Update: Update<PantryItemRow>; Relationships: [] }
      weekly_menus: { Row: Row<WeeklyMenuRow>; Insert: Insert<WeeklyMenuRow>; Update: Update<WeeklyMenuRow>; Relationships: [] }
      menu_entries: { Row: Row<MenuEntryRow>; Insert: Insert<MenuEntryRow>; Update: Update<MenuEntryRow>; Relationships: [] }
      shopping_list_items: { Row: Row<ShoppingListItemRow>; Insert: Insert<ShoppingListItemRow>; Update: Update<ShoppingListItemRow>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      recipes_by_ingredients: {
        Args: { p_ingredient_ids: string[] }
        Returns: {
          recipe_id: string
          total_count: number
          have_count: number
          missing_count: number
          match_ratio: number
        }[]
      }
    }
    Enums: {
      cuisine: Cuisine
      category: Category
      meal_type: MealType
      sex: Sex
      goal: Goal
      activity_level: ActivityLevel
      recipe_source: RecipeSource
    }
    CompositeTypes: Record<string, never>
  }
}
