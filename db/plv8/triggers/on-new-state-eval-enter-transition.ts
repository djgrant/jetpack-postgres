import { MachineRow, TaskRow } from "@djgrant/jetpack";
import { dispatchAction } from "../queries";

declare const NEW: TaskRow;

export default function afterUpdateTaskState() {
  const transitionsQuery = plv8.prepare<MachineRow>(
    "select transitions from jetpack.machines where id = $1",
    ["uuid"]
  );

  const [machine] = transitionsQuery.execute([NEW.machine_id]);
  if (!machine) return null;

  const onEnterOperation = machine.transitions[NEW.state]?.onEvent?.ENTER;
  if (!onEnterOperation) return null;

  dispatchAction(NEW.id, "ENTER");
}
