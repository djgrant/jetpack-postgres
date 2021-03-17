drop function if exists jetpack.eval_transition cascade;

create function jetpack.eval_transition() returns trigger as $$
  :import_ts('triggers/on-insert-action-eval-transition');
$$ language plv8 volatile;

create trigger before_insert_action
before insert on jetpack.actions
for each row
execute procedure jetpack.eval_transition();
