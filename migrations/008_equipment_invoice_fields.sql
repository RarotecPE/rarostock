-- Adds invoice attachment fields to individual equipments.
-- Product/acquisition invoices now live under FTP folder notasProdutos.
-- Equipment invoices live under FTP folder notasEquipamentos.

alter table equipments
  add column if not exists invoice_url text,
  add column if not exists invoice_filename varchar(255),
  add column if not exists invoice_storage_path text;

-- After moving existing product invoice files from the previous FTP folder
-- into notasProdutos, update existing database links to the new public path.
update acquisitions
set
  invoice_url = regexp_replace(invoice_url, '/([^/]+)$', '/notasProdutos/\1'),
  invoice_storage_path = regexp_replace(invoice_storage_path, '/([^/]+)$', '/notasProdutos/\1')
where invoice_url is not null
  and invoice_filename is not null
  and invoice_url not like '%/notasProdutos/%'
  and invoice_url not like '%/notasEquipamentos/%';
