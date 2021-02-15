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

taskMachine.onRunning(async self => {
  const { id, params, context, setContext, log } = self;
  log("Task machine example running!");
  log({ params, context });
  const coinFlip = Math.random() > 0.5;
  const newContext = await setContext({ [id]: { coinFlip } });
  log({ newContext });
  if (coinFlip) {
    throw new Error("Task machine failed!");
  }
});

const jetpack = new Jetpack({
  db: "postgres://danielgrant@localhost:5432/jetpack",
  machines: [taskMachine],
});

jetpack.createTask({ machine: taskMachine }).then(console.log);

jetpack.runWorker();
