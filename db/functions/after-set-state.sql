drop function if exists jetpack.after_set_state cascade; 

create function jetpack.after_set_state() returns trigger as $$ 
declare
  parent_id bigint;
  ancestors text[];
begin
  if (new is null) then
    parent_id = coalesce(old.parent_id, 0);
    ancestors = string_to_array('0.' || old.path::text, '.');
    ancestors = array_remove(ancestors, old.id::text);
    ancestors = array_remove(ancestors, parent_id::text);
  else 
    parent_id = coalesce(new.parent_id, 0);
    ancestors = string_to_array('0.' || new.path::text, '.');
    ancestors = array_remove(ancestors, new.id::text);
    ancestors = array_remove(ancestors, parent_id::text);
  end if;

  if (TG_OP = 'DELETE' and old.parent_id is not null) then
    delete from jetpack.subtree_states where task_id = old.id;
  end if;

  -- decrement counts
  if (old.state != new.state or new.state is null) then

    -- parent task
    update jetpack.subtree_states as s set 
      children = s.children - 1,
      descendants = s.descendants - 1
    where s.task_id = parent_id
    and s.state = old.state;

    -- grandparent+ tasks
    update jetpack.subtree_states as s set
      task_id = t.task_id,
      descendants = s.descendants - 1
    from (
      select unnest::bigint as task_id from unnest(ancestors)
    ) as t(task_id) 
    where s.task_id = t.task_id
    and state = old.state;
    
  end if;

  -- increment counts
  if (new.state is not null) then
  
    -- parent task
    insert into jetpack.subtree_states as s (task_id, state, children, descendants)
    values (parent_id, new.state, 1, 1)
    on conflict on constraint subtree_states_pkey do update 
    set children = s.children + 1, descendants = s.descendants + 1;

    -- grandparent+ tasks
    insert into jetpack.subtree_states as s (task_id, state, descendants, children) 
    select unnest::bigint as task_id, new.state as state, 1 as descendants, 0 as children
    from unnest(ancestors)
    on conflict on constraint subtree_states_pkey do update 
    set descendants = s.descendants + 1;
  
  end if;

	return null;
end
$$ language plpgsql volatile;


create constraint trigger state_change 
after update on jetpack.tasks
deferrable initially deferred
for each row
when (old.state != new.state)
execute procedure jetpack.after_set_state();

create constraint trigger state_insert 
after insert on jetpack.tasks
deferrable initially deferred
for each row
execute procedure jetpack.after_set_state();

create trigger state_delete
after delete on jetpack.tasks
for each row
execute procedure jetpack.after_set_state();
