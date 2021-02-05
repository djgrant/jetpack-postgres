drop function if exists jetpack.before_upsert_task cascade;

create function jetpack.before_upsert_task () returns trigger as $$
declare
  parent record;
begin
  select path into parent from jetpack.tasks where id = new.parent_id;
  if parent.path is not null then
    new.path = parent.path || new.id::text::ltree;
  else
    new.path = new.id;
  end if;
  return new;
end
$$ language plpgsql volatile;

create trigger before_insert_task
before insert on jetpack.tasks
for each row
execute procedure jetpack.before_upsert_task();

create trigger before_update_task
before update on jetpack.tasks
for each row when (old.parent_id is distinct from new.parent_id)
execute procedure jetpack.before_upsert_task();
