drop function if exists jetpack.subtree_states_aggregated;

create function jetpack.subtree_states_aggregated (id bigint) returns setof jetpack.subtree_states as 
$$
  select * 
  from jetpack.subtree_states 
  where root_task_id = id
  union
  select 
    id::bigint as root_task_id, 
    'total' as state, 
    sum(children)::int as children, 
    sum(descendants)::int as descendants 
  from jetpack.subtree_states 
  where root_task_id = id;
$$ 
language sql stable;