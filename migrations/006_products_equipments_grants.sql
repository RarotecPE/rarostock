-- Grants for the application database user after the product/equipment split.
-- Run this with a database owner/superuser, replacing the role if your app user is different.

do $$
declare
  app_role text := current_setting('app.rarostock_role', true);
begin
  if app_role is null or trim(app_role) = '' then
    app_role := 'rarostock_homolog';
  end if;

  execute format('grant select, insert, update, delete on table products to %I', app_role);
  execute format('grant select, insert, update, delete on table equipment_categories to %I', app_role);
  execute format('grant select, insert, update, delete on table equipments to %I', app_role);
  execute format('grant select, insert, update, delete on table equipment_requests to %I', app_role);
  execute format('grant select, insert, update, delete on table equipment_movements to %I', app_role);

  execute format('grant usage, select, update on sequence products_id_seq to %I', app_role);
  execute format('grant usage, select, update on sequence equipment_categories_id_seq to %I', app_role);
  execute format('grant usage, select, update on sequence equipments_id_seq to %I', app_role);
  execute format('grant usage, select, update on sequence equipment_requests_id_seq to %I', app_role);
  execute format('grant usage, select, update on sequence equipment_movements_id_seq to %I', app_role);
end $$;
