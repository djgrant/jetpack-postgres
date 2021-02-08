#!/usr/bin/env ts-node-script
import { createBaseMachine, runWorker, ops } from "@djgrant/jetpack";

const taskMachine = createBaseMachine({
  name: "Base machine example",
  initial: "ready",
  states: {
    ready: {
      onEvent: {
        LOCKED_BY_WORKER: "running",
      },
    },
    running: {
      onEvent: {
        ENTER: {
          type: "increment_attempts",
        },
        ERROR: "failed",
        SUCCESS: "done",
      },
    },
    failed: {
      onEvent: {
        ENTER: {
          type: "condition",
          when: {
            type: "lte",
            left: {
              type: "attempts",
            },
            right: 5,
          },
          then: "ready",
          else: "abandoned",
        },
      },
    },
    done: {
      onEvent: {
        ENTER: ops.createTask({
          machine: ops.self(),
        }),
      },
    },
    abandoned: {},
  },
});

taskMachine.onRunning(() => {
  console.log("Base machine example running!");
});

runWorker({
  db: { connectionString: "postgres://danielgrant@localhost:5432/jetpack" },
  machines: [taskMachine],
});
