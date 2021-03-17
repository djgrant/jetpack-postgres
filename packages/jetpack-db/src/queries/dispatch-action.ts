export function dispatchAction(taskId: string, action: string) {
  const dispatchActionQuery = plv8.prepare(
    "select * from jetpack.dispatch_action($1, $2)",
    ["bigint", "text"]
  );

  dispatchActionQuery.execute([taskId, action]);
}
