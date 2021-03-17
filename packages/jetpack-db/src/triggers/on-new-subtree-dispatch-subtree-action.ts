import { MachineRow, SubtreeStatesRow } from "@djgrant/jetpack";
import { dispatchAction } from "../queries";

declare const subtree_state: SubtreeStatesRow;

export default function evalSubtreeActions() {
  if (Number(subtree_state.task_id) === 0) return null;

  const machineQuery = plv8.prepare<MachineRow & { task_state: string }>(
    `select m.*, t.state as task_state from jetpack.machines m
    inner join jetpack.tasks t
    on t.machine_id = m.id
    and t.id = $1`,
    ["bigint"]
  );

  const [machine] = machineQuery.execute([subtree_state.task_id]);
  const onEvent = machine?.transitions[machine.task_state]?.onEvent || {};

  if ("SUBTREE_UPDATE" in onEvent) {
    dispatchAction(subtree_state.task_id, "SUBTREE_UPDATE");
  }

  return null;
}
