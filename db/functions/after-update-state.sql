drop function if exists jetpack.after_update_state cascade;

create function jetpack.after_update_state() returns trigger as $$
  :import_ts('triggers/after-update-state')
$$ language plv8 volatile;

create trigger after_update_state
after update on jetpack.tasks
for each row
when (old.state is distinct from new.state)
execute procedure jetpack.after_update_state();
