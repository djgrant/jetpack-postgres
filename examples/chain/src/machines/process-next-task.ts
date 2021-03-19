import { createTaskMachine, Operator, ops } from "@djgrant/jetpack";
import { processNextTask } from "../tasks/process-next-task";

const ifNotLastTask = (then: Operator) =>
  ops.condition({
    when: ops.notEq(ops.context("currentId"), ops.context("lastId")),
    then,
  });

export const processNextTaskMachine = createTaskMachine({
  name: "Process Next Task",
  task: processNextTask,
  maxAttempts: 3,
  states: {
    done: {
      onEvent: {
        ENTER: ifNotLastTask(
          ops.createSubTask({
            machine: ops.self(),
            context: {
              lastId: ops.context("currentId"),
            },
          })
        ),
      },
    },
  },
});
