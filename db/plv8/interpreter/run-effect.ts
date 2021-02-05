import { EffectOperator, TaskRow } from "@djgrant/jetpack";
import { updateStatus } from "../queries";
import { incrementAttempts } from "../queries/increment-attempts";

export function runEffect(op: EffectOperator, task: TaskRow) {
  if (typeof op === "string") {
    updateStatus(task.id, op);
    return;
  }

  if (op.type === "change-status") {
    updateStatus(task.id, op.newStatus);
  }

  if (op.type === "increment-attempts") {
    incrementAttempts(task.id);
  }
}
