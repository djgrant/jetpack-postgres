drop function if exists jetpack.dispatch_action cascade;

create function jetpack.dispatch_action(task_id bigint, action_type text, payload jsonb default null) returns jetpack.actions as $$
  insert into jetpack.actions (type, task_id, payload) 
  values (action_type, task_id, payload)
  returning *;
$$ language sql volatile;
