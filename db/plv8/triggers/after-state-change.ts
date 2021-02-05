import { MachineRow, TaskRow } from "@djgrant/jetpack";
import { dispatchAction } from "../queries";

declare const NEW: TaskRow;

export default function afterTaskstateChange() {
  const transitionsQuery = plv8.prepare<MachineRow>(
    "select transitions from jetpack.machines where id = $1",
    ["uuid"]
  );

  const [machine] = transitionsQuery.execute([NEW.machine_id]);
  if (!machine) return NEW;

  const onEnterOperation = machine.transitions[NEW.state]?.onEvent?.ENTER;
  if (!onEnterOperation) return NEW;

  dispatchAction(NEW.id, "ENTER");
}
