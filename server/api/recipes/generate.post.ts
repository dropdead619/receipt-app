import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Category, Cuisine } from '#shared/types'
import { generateRecipe } from '~~/server/utils/anthropic'
import { persistRecipe } from '~~/server/utils/persistRecipe'

export default defineEventHandler(async (event) => {
  // Только авторизованные могут запускать генерацию
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Требуется вход' })

  const body = await readBody<{
    cuisine?: Cuisine
    category?: Category
    prompt?: string
    servings?: number
  }>(event)

  const generated = await generateRecipe({
    cuisine: body.cuisine,
    category: body.category,
    prompt: body.prompt,
    servings: body.servings,
  })

  const supabase = serverSupabaseServiceRole(event)
  const result = await persistRecipe(supabase, generated)

  return result
})
