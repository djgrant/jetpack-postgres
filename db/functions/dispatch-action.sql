drop function if exists jetpack.dispatch_action cascade;

create function jetpack.dispatch_action(task_id bigint, action_type text, payload jsonb default null) returns jetpack.actions as $$
  with current_snapshot as (
    select to_jsonb(t) as snapshot from jetpack.tasks t where t.id = task_id order by id desc limit 1
  )
  insert into jetpack.actions (type, task_id, payload, previous_snapshot) 
  values (action_type, task_id, payload, (select snapshot from current_snapshot)) 
  returning *;
$$ language sql volatile;
