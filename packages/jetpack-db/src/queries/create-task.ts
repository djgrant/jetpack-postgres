import { TaskRow, EvaluatedExpressionMap } from "@djgrant/jetpack";

interface TaskInput {
  machine_id: string;
  parent_id?: string | null;
  params?: EvaluatedExpressionMap;
  context?: EvaluatedExpressionMap;
}

export function createTask(task: TaskInput): TaskRow {
  const createTaskQuery = plv8.prepare(
    "select * from jetpack.create_task($1, $2, $3, $4)",
    ["uuid", "bigint", "jsonb", "jsonb"]
  );

  const [newTask] = createTaskQuery.execute([
    task.machine_id,
    task.parent_id,
    task.params || {},
    task.context || {},
  ]);

  return newTask;
}
