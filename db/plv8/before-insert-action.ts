import { Plv8, Action } from "./interfaces";

declare var plv8: Plv8;
declare var NEW: Action;
declare var ERROR: string;

export default function() {
  var { type, task_id } = NEW;
  var task_query = plv8.prepare("select * from jetpack.tasks where id = $1", [
    "bigint",
  ]);
  var [task] = task_query.execute([task_id]);

  if (!task) return;

  NEW.snapshot = task;

  var machine_query = plv8.prepare(
    "select def from jetpack.machines where id = $1",
    ["uuid"]
  );
  var [machine] = machine_query.execute([task.machine_id]);
  if (!machine) return NEW;

  var transitions =
    machine.def[task.status] &&
    machine.def[task.status].onEvent &&
    machine.def[task.status].onEvent[type];

  // plv8.elog(ERROR, JSON.stringify(transitions));

  if (!transitions) return NEW;

  for (var transition of [].concat(transitions)) {
    // TODO
  }

  var [updated_task] = task_query.execute([task_id]);
  NEW.snapshot = updated_task;
  return NEW;
}
