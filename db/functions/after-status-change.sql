drop function if exists jetpack.after_status_change cascade;

create function jetpack.after_status_change() returns trigger as $$
  :import_ts('triggers/after-status-change')
$$ language plv8 volatile;

create trigger after_status_change
after update on jetpack.tasks
for each row
when (old.status is distinct from new.status)
execute procedure jetpack.after_status_change();
