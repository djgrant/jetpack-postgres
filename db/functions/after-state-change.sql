drop function if exists jetpack.after_state_change cascade;

create function jetpack.after_state_change() returns trigger as $$
  :import_ts('triggers/after-state-change')
$$ language plv8 volatile;

create trigger after_state_change
after update on jetpack.tasks
for each row
when (old.state is distinct from new.state)
execute procedure jetpack.after_state_change();
