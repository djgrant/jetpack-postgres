export function updatestate(taskId: string, newState: string) {
  const updatestateQuery = plv8.prepare(
    "update jetpack.tasks set state = $1 where id = $2",
    ["text", "bigint"]
  );

  updatestateQuery.execute([newState, taskId]);
}
