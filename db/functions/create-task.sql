drop function if exists jetpack.create_task cascade;

create function jetpack.create_task(
  machine_id uuid,
  parent_id bigint default null,
  params jsonb default '{}', 
  context jsonb default '{}'
) returns jetpack.tasks as $$
  insert into jetpack.tasks (machine_id, parent_id, params, context, status, iterations)
  values (machine_id, parent_id, params, context, 'pending', 0)
  returning *;
$$ language sql volatile;