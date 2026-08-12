alter table acquisitions
  add column if not exists purchase_type varchar(20) not null default 'physical_store';

alter table acquisitions
  drop constraint if exists acquisitions_purchase_type_check;

alter table acquisitions
  add constraint acquisitions_purchase_type_check
  check (purchase_type in ('physical_store', 'online'));
