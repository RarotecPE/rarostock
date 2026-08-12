alter table equipments
  add column if not exists responsibility_term_url text,
  add column if not exists responsibility_term_filename varchar(255),
  add column if not exists responsibility_term_storage_path text;
