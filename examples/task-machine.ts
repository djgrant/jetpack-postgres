#!/usr/bin/env ts-node-script
import { Jetpack, createTaskMachine, ops } from "@djgrant/jetpack";

const jetpack = new Jetpack({ db: process.env.DATABASE_URL });

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

jetpack.createTask({ machine: taskMachine });

jetpack.runWorker({ machines: [taskMachine] });
