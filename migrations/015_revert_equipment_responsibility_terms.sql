-- Reverte a estrutura de termos de responsabilidade de equipamentos.
-- Mantem as migrations anteriores no historico, mas remove os objetos aplicados por elas.

drop table if exists equipment_responsibility_terms;

alter table equipments
  drop column if exists responsibility_term_url,
  drop column if exists responsibility_term_filename,
  drop column if exists responsibility_term_storage_path;
