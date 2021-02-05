import { EffectOperator, TaskRow } from "@djgrant/jetpack";

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

  return task;
}
