import { MachineRow, TaskRow } from "@djgrant/jetpack";
import { dispatchAction } from "../queries";

declare const NEW: TaskRow;

export default function onNewTaskState() {
  const transitionsQuery = plv8.prepare<MachineRow>(
    "select transitions from jetpack.machines where id = $1",
    ["uuid"]
  );

  const [machine] = transitionsQuery.execute([NEW.machine_id]);
  const onEvent = machine?.transitions[NEW.state]?.onEvent || {};

  if ("ENTER" in onEvent) {
    dispatchAction(NEW.id, "ENTER");
  }

  return null;
}
