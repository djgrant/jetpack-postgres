#!/usr/bin/env ts-node-script
import {
  Jetpack,
  createBaseMachine,
  createTaskMachine,
  ops,
} from "@djgrant/jetpack";

const subtreeFailureMachine = createTaskMachine({
  name: "Subtree Failure",
  maxAttempts: 3,
});

const taskMachine = createTaskMachine({
  name: "Task machine",
  maxAttempts: 3,
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({ machine: ops.self() }),
      },
    },
  },
});

const rootMachine = createBaseMachine({
  name: "Root machine",
  initial: "done",
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({ machine: taskMachine }),
        SUBTREE_UPDATE: ops.condition({
          when: ops.all([
            ops.subtree.all("done", "abandoned"),
            ops.subtree.some("abandoned"),
          ]),
          then: ops.createRootTask({
            machine: subtreeFailureMachine,
          }),
        }),
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

subtreeFailureMachine.onRunning(async () => {
  console.log("Task machine subtree failed!");
});

const jetpack = new Jetpack({
  db: "postgres://danielgrant@localhost:5432/jetpack",
  machines: [rootMachine, taskMachine, subtreeFailureMachine],
});

jetpack.createTask({ machine: rootMachine }).catch(console.log);

jetpack.runWorker();
