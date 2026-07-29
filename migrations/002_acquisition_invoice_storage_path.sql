-- 002_acquisition_invoice_storage_path.sql
-- Permite remover o arquivo de nota fiscal do storage quando o anexo for excluido.

alter table acquisitions
  add column if not exists invoice_storage_path text;
