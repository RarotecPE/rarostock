-- 001_initial_schema.sql
-- Rarostock - schema inicial para Supabase/PostgreSQL.
-- Execute os arquivos desta pasta em ordem crescente.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'item_type') then
    create type item_type as enum ('Equipamento', 'Item de Consumo');
  end if;
end $$;

create table if not exists items (
  id serial primary key,
  code varchar(20) not null unique,
  name varchar(255) not null,
  category varchar(100) not null,
  unit varchar(50) not null,
  type item_type not null,
  minimum_limit integer,
  brand varchar(100),
  additional_unit varchar(50),
  observations text,
  quantity integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists acquisitions (
  id serial primary key,
  date timestamp not null,
  total_value numeric(12, 2) not null default 0,
  invoice_url text,
  invoice_filename varchar(255),
  created_at timestamp not null default now()
);

create table if not exists acquisition_items (
  id serial primary key,
  acquisition_id integer not null references acquisitions(id) on delete cascade,
  item_id integer not null references items(id) on delete cascade,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  total_price numeric(12, 2) not null
);

create table if not exists stock_issues (
  id serial primary key,
  item_id integer not null references items(id) on delete cascade,
  quantity integer not null,
  date timestamp not null,
  reason text,
  created_at timestamp not null default now()
);
