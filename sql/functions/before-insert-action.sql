drop function if exists jetpack.before_insert_action cascade;

create function jetpack.before_insert_action() returns trigger as $$
  var { type, task_id, payload } = NEW;
  var task_query = plv8.prepare('select * from jetpack.tasks where id = $1', ['bigint']);
  var [task] = task_query.execute([task_id]);
  if (!task) return;

  NEW.snapshot = task;

  var machine_query = plv8.prepare('select def from jetpack.machines where id = $1', ['uuid']);
  var [machine] = machine_query.execute([task.machine_id]);
  if (!machine) return NEW;

  var transitions = machine.def[task.status] && machine.def[task.status].onEvent && machine.def[task.status].onEvent[type];
  plv8.elog(ERROR, JSON.stringify(machine.def));
  if (!transitions) return NEW;
  
  for (var transition of [].concat(transitions)) {
  }

  var [updated_task] = task_query.execute([task_id]);
  NEW.snapshot = updated_task;
  return NEW;
$$ language plv8 volatile;

create trigger before_insert_action
before insert on jetpack.actions
for each row
execute procedure jetpack.before_insert_action();