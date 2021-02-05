drop function if exists jetpack.before_insert_action cascade;

create function jetpack.before_insert_action() returns trigger as $$
  :import_ts('triggers/before-insert-action')
$$ language plv8 volatile;

create trigger before_insert_action
before insert on jetpack.actions
for each row
execute procedure jetpack.before_insert_action();