drop function if exists jetpack.dispatch_subtree_action_once cascade;
drop function if exists jetpack.dispatch_subtree_action cascade;

create function jetpack.dispatch_subtree_action_once() returns trigger as $$
declare
  already_run int;
begin
  create temp table if not exists transaction_attempts (
    task_id bigint primary key
  ) on commit drop;

  select task_id into already_run from transaction_attempts where task_id = NEW.task_id;

  if (already_run is not null) then
    return null;
  else
    insert into transaction_attempts (task_id) values (NEW.task_id);
    perform jetpack.dispatch_subtree_action(NEW);
    return null;
  end if;
end
$$ language plpgsql volatile;


create function jetpack.dispatch_subtree_action(subtree_state jetpack.subtree_states) returns void as $$
  :import_ts('triggers/on-new-subtree-dispatch-subtree-action');
$$ language plv8 volatile;

create constraint trigger after_update_subtree_state
after update on jetpack.subtree_states
deferrable initially deferred
for each row
execute function jetpack.dispatch_subtree_action_once();

create constraint trigger after_insert_subtree_state
after insert on jetpack.subtree_states
deferrable initially deferred
for each row
execute function jetpack.dispatch_subtree_action_once();
