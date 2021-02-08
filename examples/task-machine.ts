#!/usr/bin/env ts-node-script
import { createTaskMachine, runWorker, ops } from "@djgrant/jetpack";

const taskMachine = createTaskMachine({
  name: "Task machine example",
  maxAttempts: 3,
  states: {
    done: {
      onEvent: {
        ENTER: ops.createTask({
          machine: ops.self(),
        }),
      },
    },
  },
});

taskMachine.onRunning(async () => {
  console.log("Task machine example running!");
  if (Math.random() > 0.5) {
    throw new Error("Task machine failed!");
  }
});

runWorker({
  db: { connectionString: "postgres://danielgrant@localhost:5432/jetpack" },
  machines: [taskMachine],
});
