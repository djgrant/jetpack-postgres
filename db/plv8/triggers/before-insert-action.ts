import { MachineRow, ActionRow, TaskRow, ops } from "@djgrant/jetpack";
import { evaluateOperation, runEffect } from "../interpreter";
import { updateTask } from "../queries/update-task";

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

  NEW.previous_state = task.state;
  NEW.new_state = task.state;
  NEW.operation = ops.noOp();

  const [machine] = transitionsQuery.execute([task.machine_id]);
  if (!machine) return NEW;

  const operation = machine.transitions[task.state]?.onEvent?.[type];
  if (!operation) return NEW;

  const effectOperator = evaluateOperation(operation, task);
  const effectedTask = runEffect(effectOperator, task);

  if (effectedTask) {
    const updatedTask = updateTask(effectedTask);
    NEW.new_state = updatedTask.state;
  }

  NEW.operation = effectOperator;

  return NEW;
}
