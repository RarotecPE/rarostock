-- Split product and equipment domains.
-- Keep legacy public.items for historical rows that existed before this refactor.

do $$ begin
  create type equipment_holder_type as enum ('company', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type equipment_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type equipment_request_type as enum ('obtain', 'transfer');
exception when duplicate_object then null; end $$;

create table if not exists products (
  id serial primary key,
  code varchar(20) not null unique,
  name varchar(255) not null,
  category varchar(100) not null,
  unit varchar(50) not null,
  minimum_limit integer not null,
  desired_limit integer not null,
  brand varchar(100),
  additional_unit varchar(50),
  observations text,
  quantity integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint products_limits_check check (desired_limit >= minimum_limit)
);

insert into products (id, code, name, category, unit, minimum_limit, desired_limit, brand, additional_unit, observations, quantity, created_at, updated_at)
select id, code, name, category, unit, coalesce(minimum_limit, 0), coalesce(desired_limit, minimum_limit, 0), brand, additional_unit, observations, quantity, created_at, updated_at
from items
where type = 'Item de Consumo'
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('products', 'id'), coalesce((select max(id) from products), 1), true);

alter table acquisition_items drop constraint if exists acquisition_items_item_id_items_id_fk;
alter table stock_issues drop constraint if exists stock_issues_item_id_items_id_fk;

create table if not exists equipment_categories (
  id serial primary key,
  name varchar(100) not null unique,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

insert into equipment_categories (name)
select distinct category
from items
where type = 'Equipamento'
  and category is not null
  and trim(category) <> ''
on conflict (name) do nothing;

create table if not exists equipments (
  id serial primary key,
  code varchar(40) not null unique,
  name varchar(255) not null,
  brand varchar(100),
  category varchar(100) not null,
  price numeric(12,2),
  observations text,
  holder_type equipment_holder_type not null default 'company',
  holder_user_id uuid,
  holder_user_name varchar(255),
  holder_user_email varchar(255),
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

insert into equipments (code, name, brand, category, price, observations, holder_type, created_at, updated_at)
select
  case when greatest(i.quantity, 1) = 1 then i.code else i.code || '-' || lpad(gs.n::text, 3, '0') end,
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
on conflict (code) do nothing;

create table if not exists equipment_requests (
  id serial primary key,
  equipment_id integer not null references equipments(id) on delete cascade,
  type equipment_request_type not null,
  status equipment_request_status not null default 'pending',
  requester_user_id uuid not null,
  requester_name varchar(255) not null,
  requester_email varchar(255) not null,
  from_holder_type equipment_holder_type not null,
  from_user_id uuid,
  from_user_name varchar(255),
  from_user_email varchar(255),
  to_holder_type equipment_holder_type not null,
  to_user_id uuid,
  to_user_name varchar(255),
  to_user_email varchar(255),
  reason text,
  decided_by_user_id uuid,
  decided_at timestamp,
  decision_note text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists equipment_movements (
  id serial primary key,
  equipment_id integer not null references equipments(id) on delete cascade,
  from_holder_type equipment_holder_type not null,
  from_user_id uuid,
  from_user_name varchar(255),
  from_user_email varchar(255),
  to_holder_type equipment_holder_type not null,
  to_user_id uuid,
  to_user_name varchar(255),
  to_user_email varchar(255),
  reason text,
  request_id integer,
  created_by_user_id uuid,
  created_at timestamp not null default now()
);

create index if not exists equipments_holder_user_id_idx on equipments(holder_user_id);
create index if not exists equipments_category_idx on equipments(category);
create index if not exists equipment_requests_equipment_id_idx on equipment_requests(equipment_id);
create index if not exists equipment_requests_status_idx on equipment_requests(status);
create index if not exists equipment_requests_to_user_id_idx on equipment_requests(to_user_id);
create index if not exists equipment_requests_requester_user_id_idx on equipment_requests(requester_user_id);
