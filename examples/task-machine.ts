#!/usr/bin/env ts-node-script
import { Jetpack, createTaskMachine, ops } from "@djgrant/jetpack";

const taskMachine = createTaskMachine({
  name: "Task machine example",
  maxAttempts: 3,
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({ machine: ops.self() }),
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

const jetpack = new Jetpack({
  db: "postgres://danielgrant@localhost:5432/jetpack",
  machines: [taskMachine],
});

jetpack.runWorker();

jetpack.createTask({ machine: taskMachine }).then(console.log);
