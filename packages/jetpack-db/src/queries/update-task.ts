import { TaskRow } from "@djgrant/jetpack";

export function updateTask(task: TaskRow): TaskRow {
  const updateTaskQuery = plv8.prepare(
    `
    update jetpack.tasks 
    set context = $1, state = $2, attempts = $3 
    where id = $4
    returning *
    `,
    ["jsonb", "text", "int", "bigint"]
  );

  const [updatedTask] = updateTaskQuery.execute([
    task.context,
    task.state,
    task.attempts,
    task.id,
  ]);

  return updatedTask;
}
