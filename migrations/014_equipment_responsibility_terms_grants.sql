-- Grants for responsibility terms saved per equipment/user.
-- Run this with a database owner/superuser, replacing the role if your app user is different.

do $$
declare
  app_role text := current_setting('app.rarostock_role', true);
begin
  if app_role is null or trim(app_role) = '' then
    app_role := 'rarostock_homolog';
  end if;

  execute format('grant select, insert, update, delete on table equipment_responsibility_terms to %I', app_role);
  execute format('grant usage, select, update on sequence equipment_responsibility_terms_id_seq to %I', app_role);
end $$;

