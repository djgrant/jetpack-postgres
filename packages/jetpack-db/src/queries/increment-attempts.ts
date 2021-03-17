export function incrementAttempts(taskId: string) {
  const incrementQuery = plv8.prepare(
    "update jetpack.tasks set attempts = attempts + 1 where id = $1",
    ["bigint"]
  );

  incrementQuery.execute([taskId]);
}
