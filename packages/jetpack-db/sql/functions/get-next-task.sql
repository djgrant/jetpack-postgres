drop function if exists jetpack.get_next_task cascade;

create function jetpack.get_next_task() returns jetpack.tasks as $$
declare
  next_task jetpack.tasks;
begin
  select * into next_task
  from jetpack.tasks
  where state = 'ready'
  order by id
  limit 1
  for update skip locked;

	if not found then 
	  return next_task;
	end if;

  perform jetpack.dispatch_action(next_task.id, 'LOCKED_BY_WORKER');

  return next_task;
end
$$ language plpgsql volatile;
