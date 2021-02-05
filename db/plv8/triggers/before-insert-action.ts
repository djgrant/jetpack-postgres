import { MachineRow, ActionRow, TaskRow, ops } from "@djgrant/jetpack";
import { evaluateOperator, runEffect } from "../lib";

declare const NEW: ActionRow;

export default function beforeInsertAction() {
  const { type, task_id } = NEW;

  const taskQuery = plv8.prepare<TaskRow>(
    "select * from jetpack.tasks where id = $1",
    ["bigint"]
  );

  const transitionsQuery = plv8.prepare<MachineRow>(
    "select transitions from jetpack.machines where id = $1",
    ["uuid"]
  );

  const [task] = taskQuery.execute([task_id]);

  if (!task) {
    throw new Error(`Task ${task_id} does not exist`);
  }

  NEW.snapshot = task;
  NEW.operation = ops.noOp();

  const [machine] = transitionsQuery.execute([task.machine_id]);
  if (!machine) return NEW;

  const operation = machine.transitions[task.status]?.onEvent?.[type];
  if (!operation) return NEW;

  const effectOperator = evaluateOperator(operation, task);
  runEffect(effectOperator, task);

  const [updatedTask] = taskQuery.execute([task_id]);
  NEW.snapshot = updatedTask;
  NEW.operation = effectOperator;
  return NEW;
}
