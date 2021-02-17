drop function if exists jetpack.subtree_states_aggregated;

create function jetpack.subtree_states_aggregated (id bigint) returns setof jetpack.subtree_states as 
$$
  select * 
  from jetpack.subtree_states 
  where task_id = id
  union
  select 
    id::bigint as task_id, 
    'total' as state, 
    coalesce(sum(children), 0)::int as children, 
    coalesce(sum(descendants), 0)::int as descendants 
  from jetpack.subtree_states 
  where task_id = id;
$$ 
language sql stable;