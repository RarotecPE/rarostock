alter table equipments
  add column if not exists requires_responsibility_term boolean not null default false;
