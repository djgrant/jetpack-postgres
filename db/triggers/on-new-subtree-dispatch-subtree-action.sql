drop function if exists jetpack.dispatch_subtree_action cascade;

create function jetpack.dispatch_subtree_action() returns trigger as $$
  :import_ts('triggers/on-new-subtree-dispatch-subtree-action');
$$ language plv8 volatile;

create trigger after_update_subtree_state
after update on jetpack.subtree_states
for each row
execute function jetpack.dispatch_subtree_action();

create trigger after_insert_subtree_state
after insert on jetpack.subtree_states
for each row
execute function jetpack.dispatch_subtree_action();
