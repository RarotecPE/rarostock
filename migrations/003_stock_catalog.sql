-- 003_stock_catalog.sql
-- Catalogos editaveis de categorias e unidades do estoque.

create table if not exists stock_categories (
  id serial primary key,
  name varchar(100) not null unique,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists stock_units (
  id serial primary key,
  name varchar(50) not null unique,
  plural_name varchar(50) not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

insert into stock_categories (name, active, sort_order) values
  ('Computador', true, 10),
  ('Monitor', true, 20),
  ('Periféricos', true, 30),
  ('Infraestrutura', true, 40),
  ('Mobiliário', true, 50),
  ('Suprimento Geral', true, 60),
  ('Suprimento de TI', true, 70),
  ('Outro', true, 80)
on conflict (name) do nothing;

insert into stock_units (name, plural_name, active, sort_order) values
  ('Unidade', 'Unidades', true, 10),
  ('Pacote', 'Pacotes', true, 20),
  ('Caixa', 'Caixas', true, 30),
  ('Litro', 'Litros', true, 40),
  ('Kg', 'Kg', true, 50),
  ('Resma', 'Resmas', true, 60),
  ('Rolo', 'Rolos', true, 70),
  ('Galão', 'Galões', true, 80),
  ('Fardo', 'Fardos', true, 90)
on conflict (name) do nothing;