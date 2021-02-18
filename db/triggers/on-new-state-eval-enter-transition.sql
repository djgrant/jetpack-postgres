drop function if exists jetpack.eval_enter_transition cascade;

create function jetpack.eval_enter_transition() returns trigger as $$
  :import_ts('triggers/on-new-state-eval-enter-transition');
$$ language plv8 volatile;

create trigger after_update_state
after update on jetpack.tasks
for each row
when (old.state is distinct from new.state)
execute procedure jetpack.eval_enter_transition();
