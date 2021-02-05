drop function if exists jetpack.after_update_task cascade;

-- not sure what this is for
create function jetpack.after_update_task () returns trigger as $$
begin
  update jetpack.tasks
  set path = new.path || subpath(path, nlevel(old.path))
  where old.path @> path
  and old.path != path;
  return new;
end
$$ language plpgsql volatile;

create trigger after_update_task
after update on jetpack.tasks
for each row when (old.parent_id is distinct from new.parent_id)
execute procedure jetpack.after_update_task();
