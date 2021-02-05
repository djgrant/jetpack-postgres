export function updateStatus(taskId: string, newStatus: string) {
  const updateStatusQuery = plv8.prepare(
    "update jetpack.tasks set status = $1 where id = $2",
    ["text", "bigint"]
  );

  updateStatusQuery.execute([newStatus, taskId]);
}
