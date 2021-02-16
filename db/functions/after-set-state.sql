drop function if exists jetpack.after_set_state cascade;

create function jetpack.after_set_state() returns trigger as $$ 
declare
  parent_task_id bigint;
  ancestors text[];
begin
  parent_task_id = coalesce(new.parent_id, 0);
  ancestors = string_to_array('0.' || new.path::text, '.');
  ancestors = array_remove(ancestors, new.id::text);
  ancestors = array_remove(ancestors, parent_task_id::text);
  
  -- decrement counts
  if (old.state != new.state) then
    
    -- parent task
    update jetpack.subtree_states as nc set 
      children = nc.children - 1,
      descendants = nc.descendants - 1
    where nc.root_task_id = parent_task_id
    and nc.state = old.state;

    -- grandparent+ tasks
    update jetpack.subtree_states as nc set
      root_task_id = t.root_task_id,
      descendants = nc.descendants - 1
    from (
      select unnest::bigint as root_task_id from unnest(ancestors)
    ) as t(root_task_id) 
    where nc.root_task_id = t.root_task_id
    and state = old.state;
    
  end if;

  -- increment counts
  -- parent task
  insert into jetpack.subtree_states as nc (root_task_id, state, children, descendants)
  values (parent_task_id, new.state, 1, 1)
  on conflict on constraint subtree_states_pkey do update 
  set children = nc.children + 1, descendants = nc.descendants + 1;

  -- grandparent+ tasks
  insert into jetpack.subtree_states as nc (root_task_id, state, descendants, children) 
  select unnest::bigint as root_task_id, new.state as state, 1 as descendants, 0 as children
  from unnest(ancestors)
  on conflict on constraint subtree_states_pkey do update 
  set descendants = nc.descendants + 1;

	return null;
end
$$ language plpgsql volatile;


create trigger state_change 
after update on jetpack.tasks
for each row
when (old.state != new.state)
execute function jetpack.after_set_state();

create trigger state_insert 
after insert on jetpack.tasks
for each row
execute function jetpack.after_set_state();
