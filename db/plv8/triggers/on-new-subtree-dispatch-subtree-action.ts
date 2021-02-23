import { MachineRow, SubtreeStatesRow } from "@djgrant/jetpack";
import { dispatchAction } from "../queries";

declare const NEW: SubtreeStatesRow;

export default function evalSubtreeActions() {
  if (Number(NEW.task_id) === 0) return null;

  const machineQuery = plv8.prepare<MachineRow & { task_state: string }>(
    `select m.*, t.state as task_state from jetpack.machines m
    inner join jetpack.tasks t
    on t.machine_id = m.id
    and t.id = $1`,
    ["bigint"]
  );

  const [machine] = machineQuery.execute([NEW.task_id]);
  const onEvent = machine?.transitions[machine.task_state]?.onEvent || {};

  if ("SUBTREE_UPDATE" in onEvent) {
    dispatchAction(NEW.task_id, "SUBTREE_UPDATE");
  }

  return null;
}
