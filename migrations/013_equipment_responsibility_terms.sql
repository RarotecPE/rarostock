create table if not exists equipment_responsibility_terms (
  id serial primary key,
  equipment_id integer not null references equipments(id) on delete cascade,
  user_id uuid not null,
  user_name varchar(255),
  user_email varchar(255),
  url text not null,
  filename varchar(255) not null,
  storage_path text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (equipment_id, user_id)
);

insert into equipment_responsibility_terms (
  equipment_id,
  user_id,
  user_name,
  user_email,
  url,
  filename,
  storage_path,
  created_at,
  updated_at
)
select
  id,
  holder_user_id,
  holder_user_name,
  holder_user_email,
  responsibility_term_url,
  responsibility_term_filename,
  responsibility_term_storage_path,
  now(),
  now()
from equipments
where holder_type = 'user'
  and holder_user_id is not null
  and responsibility_term_url is not null
  and responsibility_term_filename is not null
  and responsibility_term_storage_path is not null
on conflict (equipment_id, user_id) do nothing;