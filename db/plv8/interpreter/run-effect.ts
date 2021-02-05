import { EffectOperator, TaskRow } from "@djgrant/jetpack";

export function runEffect(op: EffectOperator, task: TaskRow) {
  if (typeof op === "string") {
    task.status = op;
    return task;
  }

  if (op.type === "change-status") {
    task.status = op.newStatus;
    return task;
  }

  if (op.type === "increment-attempts") {
    task.attempts = task.attempts + 1;
    return task;
  }

  return task;
}
