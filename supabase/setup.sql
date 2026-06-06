-- ╔═══════════════════════════════════════════╗
-- ║  Receipt-app: полная начальная настройка БД ║
-- ╚═══════════════════════════════════════════╝

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Recipe app — начальная схема: справочники, рецепты, профили,   ║
-- ║  кладовая, меню, избранное, список закупа + RLS                 ║
-- ╚══════════════════════════════════════════════════════════════╝

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ── Перечисления ──────────────────────────────────────────────
create type cuisine as enum (
  'russian','italian','indian','korean','georgian',
  'japanese','mexican','mediterranean','thai','french'
);
create type category as enum (
  'breakfast','soup','salad','main','side','dessert','snack','drink'
);
create type meal_type as enum ('breakfast','lunch','dinner','snack');
create type sex as enum ('male','female');
create type goal as enum ('lose','maintain','gain');
create type activity_level as enum (
  'sedentary','light','moderate','active','very_active'
);
create type recipe_source as enum ('ai','manual');

-- ── Справочник ингредиентов (общий) ───────────────────────────
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text not null unique,
  kcal_100g numeric(7,2) not null,
  protein_100g numeric(6,2) not null default 0,
  fat_100g numeric(6,2) not null default 0,
  carb_100g numeric(6,2) not null default 0,
  source_ref text,
  created_at timestamptz not null default now()
);
create index ingredients_name_trgm on ingredients using gin (name gin_trgm_ops);

-- ── Рецепты (общие) ───────────────────────────────────────────
create table recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cuisine cuisine not null,
  category category not null,
  base_servings int not null default 2 check (base_servings > 0),
  time_minutes int not null default 30,
  kcal_per_serving numeric(7,2) not null,
  protein_per_serving numeric(6,2) not null default 0,
  fat_per_serving numeric(6,2) not null default 0,
  carb_per_serving numeric(6,2) not null default 0,
  steps jsonb not null default '[]'::jsonb,
  image_url text,
  source recipe_source not null default 'ai',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index recipes_cuisine_idx on recipes (cuisine);
create index recipes_category_idx on recipes (category);
create index recipes_title_trgm on recipes using gin (title gin_trgm_ops);

create table recipe_ingredients (
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  grams numeric(8,2) not null check (grams >= 0),
  display_text text not null,
  is_optional boolean not null default false,
  primary key (recipe_id, ingredient_id)
);
create index recipe_ingredients_ingredient_idx on recipe_ingredients (ingredient_id);

-- ── Профили домохозяйства (пользовательские) ──────────────────
create table household_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sex sex not null,
  age int not null check (age between 1 and 120),
  height_cm int not null check (height_cm between 50 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 400),
  activity_level activity_level not null default 'moderate',
  goal goal not null default 'maintain',
  target_kcal int not null,
  target_protein int not null default 0,
  target_fat int not null default 0,
  target_carb int not null default 0,
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now()
);
create index household_members_user_idx on household_members (user_id);

create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  meal_shares jsonb not null default
    '{"breakfast":0.25,"lunch":0.35,"dinner":0.3,"snack":0.1}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── Избранное ─────────────────────────────────────────────────
create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ── Кладовая (что в наличии) ──────────────────────────────────
create table pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  quantity numeric(8,2),
  unit text,
  created_at timestamptz not null default now(),
  unique (user_id, ingredient_id)
);
create index pantry_items_user_idx on pantry_items (user_id);

-- ── Меню на неделю ────────────────────────────────────────────
create table weekly_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table menu_entries (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references weekly_menus(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  meal_type meal_type not null,
  recipe_id uuid not null references recipes(id) on delete cascade,
  servings numeric(5,2) not null default 2,
  unique (menu_id, day_of_week, meal_type)
);

-- ── Список закупа ─────────────────────────────────────────────
create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  grams numeric(8,2),
  checked boolean not null default false,
  source_recipe_id uuid references recipes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index shopping_list_user_idx on shopping_list_items (user_id);

-- ── updated_at helper ─────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger user_settings_updated
  before update on user_settings
  for each row execute function set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  RLS: общие таблицы — read для authenticated, запись только     ║
-- ║  service_role (генерация). Пользовательские — только владелец.  ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Общие справочники: только чтение ──────────────────────────
alter table ingredients enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

create policy "ingredients read" on ingredients
  for select to authenticated using (true);
create policy "recipes read" on recipes
  for select to authenticated using (true);
create policy "recipe_ingredients read" on recipe_ingredients
  for select to authenticated using (true);
-- (service_role обходит RLS — вставка идёт из сид-скрипта/сервера)

-- ── Пользовательские таблицы: владелец = auth.uid() ───────────
alter table household_members enable row level security;
alter table user_settings enable row level security;
alter table favorites enable row level security;
alter table pantry_items enable row level security;
alter table weekly_menus enable row level security;
alter table menu_entries enable row level security;
alter table shopping_list_items enable row level security;

create policy "own household" on household_members
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own settings" on user_settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own favorites" on favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own pantry" on pantry_items
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own menus" on weekly_menus
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- menu_entries: владение через родительское меню
create policy "own menu entries" on menu_entries
  for all to authenticated
  using (
    exists (
      select 1 from weekly_menus m
      where m.id = menu_entries.menu_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from weekly_menus m
      where m.id = menu_entries.menu_id and m.user_id = auth.uid()
    )
  );

create policy "own shopping list" on shopping_list_items
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  RPC: подбор рецептов по имеющимся ингредиентам                 ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Возвращает рецепты, ранжированные по доле имеющихся ингредиентов.
-- have_count — сколько ингредиентов есть; total_count — всего (без опц.);
-- missing_count — чего не хватает (обязательных).
create or replace function recipes_by_ingredients(p_ingredient_ids uuid[])
returns table (
  recipe_id uuid,
  total_count int,
  have_count int,
  missing_count int,
  match_ratio numeric
)
language sql stable as $$
  with req as (
    select ri.recipe_id,
           count(*) filter (where not ri.is_optional) as total_count,
           count(*) filter (
             where not ri.is_optional
               and ri.ingredient_id = any(p_ingredient_ids)
           ) as have_count
    from recipe_ingredients ri
    join recipes r on r.id = ri.recipe_id and r.verified
    group by ri.recipe_id
  )
  select recipe_id,
         total_count,
         have_count,
         (total_count - have_count) as missing_count,
         case when total_count > 0
              then round(have_count::numeric / total_count, 3)
              else 0 end as match_ratio
  from req
  where have_count > 0
  order by match_ratio desc, missing_count asc;
$$;

grant execute on function recipes_by_ingredients(uuid[]) to authenticated;
