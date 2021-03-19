import {
  MachineRow,
  SubtreeStatesRow,
  SubtreeStatesAggRow,
} from "@djgrant/jetpack";
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
  const transitionMap = machine?.transitions[machine.task_state] || {};

  if ("SUBTREE_UPDATE" in transitionMap) {
    dispatchAction(subtree_state.task_id, "SUBTREE_UPDATE");
  }

  if ("SUBTREE_FLUSHED" in transitionMap) {
    const subtreeQuery = plv8.prepare<SubtreeStatesAggRow>(
      `select * from jetpack.get_subtree_states_agg($1)`,
      ["bigint"]
    );
    const subtreeStates = subtreeQuery.execute([subtree_state.task_id]);
    const subtree: Record<string, number> = {};
    for (const row of subtreeStates) {
      subtree[row.state] = row.descendants;
    }
    if (subtree.total === sum(subtree.done, subtree.abandoned)) {
      dispatchAction(subtree_state.task_id, "SUBTREE_FLUSHED");
    }
  }

  return null;
}

function sum(a: number | void, b: number | void) {
  return (a || 0) + (b || 0);
}
