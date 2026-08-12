-- Sync records that may have been created in legacy items while the
-- product/equipment split branch was not yet merged.

insert into products (
  id,
  code,
  name,
  category,
  unit,
  minimum_limit,
  desired_limit,
  brand,
  additional_unit,
  observations,
  quantity,
  created_at,
  updated_at
)
select
  i.id,
  i.code,
  i.name,
  i.category,
  i.unit,
  coalesce(i.minimum_limit, 0),
  coalesce(i.desired_limit, i.minimum_limit, 0),
  i.brand,
  i.additional_unit,
  i.observations,
  i.quantity,
  i.created_at,
  i.updated_at
from items i
where i.type = 'Item de Consumo'
  and not exists (select 1 from products p where p.id = i.id)
  and not exists (select 1 from products p where p.code = i.code);

update products p
set
  code = i.code,
  name = i.name,
  category = i.category,
  unit = i.unit,
  minimum_limit = coalesce(i.minimum_limit, 0),
  desired_limit = coalesce(i.desired_limit, i.minimum_limit, 0),
  brand = i.brand,
  additional_unit = i.additional_unit,
  observations = i.observations,
  quantity = i.quantity,
  updated_at = i.updated_at
from items i
where i.type = 'Item de Consumo'
  and p.id = i.id
  and i.updated_at > p.updated_at;

select setval(
  pg_get_serial_sequence('products', 'id'),
  coalesce((select max(id) from products), 1),
  true
);

insert into equipment_categories (name)
select distinct i.category
from items i
where i.type = 'Equipamento'
  and i.category is not null
  and trim(i.category) <> ''
on conflict (name) do nothing;

insert into equipments (
  code,
  name,
  brand,
  category,
  price,
  observations,
  holder_type,
  created_at,
  updated_at
)
select
  case
    when greatest(i.quantity, 1) = 1 then i.code
    else i.code || '-' || lpad(gs.n::text, 3, '0')
  end,
  i.name,
  i.brand,
  i.category,
  null,
  i.observations,
  'company'::equipment_holder_type,
  i.created_at,
  i.updated_at
from items i
cross join lateral generate_series(1, greatest(i.quantity, 1)) as gs(n)
where i.type = 'Equipamento'
  and not exists (
    select 1
    from equipments e
    where e.code = case
      when greatest(i.quantity, 1) = 1 then i.code
      else i.code || '-' || lpad(gs.n::text, 3, '0')
    end
  );

select setval(
  pg_get_serial_sequence('equipments', 'id'),
  coalesce((select max(id) from equipments), 1),
  true
);
