import { MachineRow, TaskRow } from "@djgrant/jetpack";

declare const NEW: TaskRow;

export default function afterTaskStatusChange() {
  const transitionsQuery = plv8.prepare<MachineRow>(
    "select transitions from jetpack.machines where id = $1",
    ["uuid"]
  );

  const [machine] = transitionsQuery.execute([NEW.machine_id]);
  if (!machine) return NEW;

  const onEnterOperation = machine.transitions[NEW.status]?.onEvent?.ENTER;
  if (!onEnterOperation) return NEW;

  const dispatchActionQuery = plv8.prepare(
    "select * from jetpack.dispatch_action($1, $2)",
    ["bigint", "text"]
  );

  dispatchActionQuery.execute([NEW.id, "ENTER"]);
}
