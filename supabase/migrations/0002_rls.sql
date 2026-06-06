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
