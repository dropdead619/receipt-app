# Рецепты под ваш каллораж 🍲

Мобильное (mobile-first) приложение рецептов на **Nuxt 4 + TypeScript + Tailwind CSS + Supabase**.

Главная фишка — адаптация рецепта на двоих взрослых с разным каллоражем. Плюс подбор
«что приготовить из имеющегося», рекомендации с автосписком закупа, фильтры по кухне и
категориям, конструктор меню на неделю и избранное. Рецепты генерируются через **Claude API**
с детерминированной проверкой КБЖУ по справочнику нутриентов **USDA**.

## Возможности

- 🔐 Авторизация (email + Google) через Supabase Auth
- 👫 Профили домохозяйства с авторасчётом КБЖУ (Mifflin–St Jeor) и ручной правкой
- 🍽 Карточка рецепта с пересчётом порций и КБЖУ под каждого взрослого
- 🥕 Кладовая → «что приготовить из этого» (поиск по ингредиентам)
- ✅ Рекомендации → отметить отсутствующее → список закупа
- 🗓 Конструктор меню на неделю (7 дней × приёмы пищи) + список закупа на неделю
- ❤️ Избранное
- 🤖 AI-генерация рецептов на русском с проверкой КБЖУ

## Стек

Nuxt 4 (`app/`), TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `@nuxtjs/supabase`,
Pinia, `@anthropic-ai/sdk`, VueUse.

## Настройка

### 1. Зависимости

Менеджер пакетов — **pnpm** (зафиксирован в `packageManager`).

```bash
pnpm install
```

### 2. Переменные окружения

Скопируйте `.env.example` → `.env` и заполните:

```
SUPABASE_URL=...
SUPABASE_KEY=...                 # anon key (клиент)
NUXT_SUPABASE_SECRET_KEY=...     # service-role key (сервер: генерация/сид)
ANTHROPIC_API_KEY=sk-ant-...
USDA_API_KEY=...                 # https://fdc.nal.usda.gov/api-key-signup.html
```

### 3. Supabase

Создайте проект и примените миграции из `supabase/migrations/` по порядку
(`0001_init.sql`, `0002_rls.sql`, `0003_functions.sql`) — через Supabase SQL Editor
или `supabase db push`. Включите Google-провайдер в Auth и добавьте redirect
`http://localhost:3000/auth/confirm`.

> Типы БД лежат в `app/types/database.types.ts` (ручная версия). Для актуализации:
> `supabase gen types typescript --linked > app/types/database.types.ts`.

### 4. Наполнение библиотеки рецептов

```bash
pnpm seed -- 40         # сгенерировать 40 рецептов по кухням/категориям
```

## Запуск

```bash
pnpm dev                # http://localhost:3000
```

> ℹ️ `TMPDIR=/tmp` уже зашит в скрипт `dev` (на macOS длинный системный `$TMPDIR`
> превышает лимит пути unix-сокета vite-node и валит dev-сервер).

## PWA (установка на телефон)

Приложение — устанавливаемая PWA. На **iOS**: открой сайт в Safari → «Поделиться» →
**«На экран Домой»**. Манифест — `public/manifest.webmanifest`, иконки генерируются из
`public/icon.svg` командой `pnpm gen:icons` (через `sharp`).

## Деплой на Netlify (CI/CD)

1. Запушь репозиторий на GitHub.
2. Netlify → **Add new site → Import from Git** → выбери репозиторий.
   Конфиг сборки берётся из `netlify.toml` (команда `pnpm build`, publish `dist`,
   Nitro сам выбирает preset `netlify`). pnpm подхватывается из `packageManager`.
3. **Site settings → Environment variables** — добавь те же ключи, что в `.env`:
   `SUPABASE_URL`, `SUPABASE_KEY`, `NUXT_SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `USDA_API_KEY`.
4. В **Supabase → Authentication → URL Configuration** добавь продакшн-домен Netlify
   в **Site URL** и **Redirect URLs** (`https://<твой-сайт>.netlify.app/auth/confirm`).
   Если используешь Google-вход — добавь callback домена и в Google Cloud.

## Структура

```
app/
  pages/        # index, auth/login, profile, recipes/[slug], pantry, cook,
                # recommended, shopping-list, menu, favorites
  components/    # RecipeCard, NutritionBadge, MemberEditor, RecipePicker, ...
  composables/   # useNutrition, useRecipes, useFavorites, usePantry,
                # useShoppingList, useMenu
  stores/        # household (Pinia)
shared/types.ts # доменные типы (общие клиент/сервер)
server/
  api/recipes/   # generate.post, by-ingredients.post
  utils/         # anthropic, nutrition, persistRecipe
scripts/seed-recipes.ts
supabase/migrations/
```

## Как работает проверка КБЖУ

1. Claude генерирует рецепт в строгий JSON: для каждого ингредиента — русское название,
   английское каноническое (для USDA), граммовка и бытовое количество.
2. По английскому названию тянем КБЖУ/100 г из USDA FoodData Central и кэшируем ингредиент.
3. Итоговый КБЖУ на порцию считаем **детерминированно** из граммовки (не доверяя цифрам LLM).
4. Если все ингредиенты сматчены — `verified = true`; иначе рецепт помечается на проверку.
