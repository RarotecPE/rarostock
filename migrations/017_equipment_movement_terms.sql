alter table equipment_movements
  add column if not exists responsibility_term_url text,
  add column if not exists responsibility_term_filename varchar(255),
  add column if not exists responsibility_term_storage_path text,
  add column if not exists devolution_term_url text,
  add column if not exists devolution_term_filename varchar(255),
  add column if not exists devolution_term_storage_path text;

alter table equipment_requests
  add column if not exists responsibility_term_url text,
  add column if not exists responsibility_term_filename varchar(255),
  add column if not exists responsibility_term_storage_path text,
  add column if not exists devolution_term_url text,
  add column if not exists devolution_term_filename varchar(255),
  add column if not exists devolution_term_storage_path text;
