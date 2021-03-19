import {
  TaskRow,
  EvaluatedEffectOperator,
  EvaluatedExpressionMap,
} from "@djgrant/jetpack";
import { createTask } from "../queries/create-task";

export function runEffect(op: EvaluatedEffectOperator, task: TaskRow) {
  if (op.type === "change_state") {
    task.state = op.new_state;
    return task;
  }

  if (op.type === "increment_attempts") {
    task.attempts = task.attempts + 1;
    return task;
  }

  if (op.type === "create_sub_task") {
    createTask({
      machine_id: op.machine_id === "$self" ? task.machine_id : op.machine_id,
      parent_id: task.id,
      params: op.params,
      context: mergeContext(task.context, op.context),
    });
    return null;
  }

  if (op.type === "create_root_task") {
    createTask({
      machine_id: op.machine_id === "$self" ? task.machine_id : op.machine_id,
      parent_id: null,
      params: op.params,
      context: op.context,
    });
    return null;
  }

  return null;
}

function mergeContext(
  oldContext: EvaluatedExpressionMap,
  newContext: EvaluatedExpressionMap | undefined
) {
  return { ...oldContext, ...newContext };
}
