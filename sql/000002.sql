drop function if exists jetpack.on_before_upsert_node cascade;
drop function if exists jetpack.on_update_node cascade;

create function jetpack.on_before_upsert_node () returns trigger as $$
declare
  parent record;
begin
  select path into parent from jetpack.nodes where id = new.parent_id;
  if parent.path is not null then
    new.path = parent.path || new.id::text::ltree;
  else
    new.path = new.id;
  end if;
  return new;
end
$$ language plpgsql volatile;

create function jetpack.on_update_node () returns trigger as $$
begin
  update jetpack.nodes
  set path = new.path || subpath(path, nlevel(old.path))
  where old.path @> path
  and old.path != path;
  return new;
end
$$ language plpgsql volatile;

create trigger before_insert_node
before insert on jetpack.nodes
for each row
execute procedure jetpack.on_before_upsert_node();

create trigger before_update_node
before update on jetpack.nodes
for each row when (old.parent_id is distinct from new.parent_id)
execute procedure jetpack.on_before_upsert_node();

create trigger after_update_node
after update on jetpack.nodes
for each row when (old.parent_id is distinct from new.parent_id)
execute procedure jetpack.on_update_node();
