import { EffectOperator, TaskRow } from "@djgrant/jetpack";

export function runEffect(op: EffectOperator, task: TaskRow) {
  if (typeof op === "string" || op.type === "change-status") {
    const updateStatusQuery = plv8.prepare(
      "update jetpack.tasks set status = $1 where id = $2",
      ["text", "bigint"]
    );
    const newStatus = typeof op === "string" ? op : op.newStatus;

    updateStatusQuery.execute([newStatus, task.id]);
  }
}
