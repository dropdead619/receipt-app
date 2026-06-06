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
