-- Point product movement history to products instead of the legacy items table.
-- Rows that still reference legacy items are remapped by product code first.
-- Acquisitions created without any item rows are removed because the cart data
-- was never persisted and cannot be rebuilt safely.
-- NOT VALID avoids breaking deploys if old historical rows still need cleanup,
-- while still enforcing the correct reference for new rows.

delete from acquisitions a
where not exists (
  select 1
  from acquisition_items ai
  where ai.acquisition_id = a.id
);

update acquisition_items ai
set item_id = p.id
from items i
join products p on p.code = i.code
where ai.item_id = i.id
  and i.type = 'Item de Consumo'
  and ai.item_id <> p.id;

update stock_issues si
set item_id = p.id
from items i
join products p on p.code = i.code
where si.item_id = i.id
  and i.type = 'Item de Consumo'
  and si.item_id <> p.id;

do $$
begin
  if exists (
    select 1
    from acquisition_items ai
    left join products p on p.id = ai.item_id
    where p.id is null
  ) then
    raise exception 'Existem acquisition_items com item_id sem produto correspondente em products.';
  end if;

  if exists (
    select 1
    from stock_issues si
    left join products p on p.id = si.item_id
    where p.id is null
  ) then
    raise exception 'Existem stock_issues com item_id sem produto correspondente em products.';
  end if;
end $$;

alter table acquisition_items drop constraint if exists acquisition_items_item_id_items_id_fk;
alter table acquisition_items drop constraint if exists acquisition_items_item_id_fkey;
alter table acquisition_items drop constraint if exists acquisition_items_item_id_products_id_fk;
alter table acquisition_items
  add constraint acquisition_items_item_id_products_id_fk
  foreign key (item_id) references products(id) on delete restrict not valid;

alter table stock_issues drop constraint if exists stock_issues_item_id_items_id_fk;
alter table stock_issues drop constraint if exists stock_issues_item_id_fkey;
alter table stock_issues drop constraint if exists stock_issues_item_id_products_id_fk;
alter table stock_issues
  add constraint stock_issues_item_id_products_id_fk
  foreign key (item_id) references products(id) on delete restrict not valid;
