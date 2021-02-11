import { EffectOperator, TaskRow } from "@djgrant/jetpack";
import { createTask } from "../queries/create-task";

export function runEffect(op: EffectOperator, task: TaskRow) {
  if (typeof op === "string") {
    task.state = op;
    return task;
  }

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
      parent_id: op.parent_id === "$self" ? task.id : op.parent_id,
    });
    return;
  }
}
