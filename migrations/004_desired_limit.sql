alter table items
  add column if not exists desired_limit integer;

update items
set desired_limit = minimum_limit
where type = 'Item de Consumo'
  and desired_limit is null;

update items
set desired_limit = null
where type = 'Equipamento';

alter table items
  drop constraint if exists items_desired_limit_gte_minimum_limit;

alter table items
  add constraint items_desired_limit_gte_minimum_limit
  check (
    desired_limit is null
    or minimum_limit is null
    or desired_limit >= minimum_limit
  );
