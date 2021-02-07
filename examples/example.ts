#!/usr/bin/env ts-node-script
import { createMachine, runWorker, ops } from "@djgrant/jetpack";

const taskMachine = createMachine({
  name: "Demo task",
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
  console.log("Demo task running!");
});

runWorker({
  db: { connectionString: "postgres://danielgrant@localhost:5432/jetpack" },
  machines: [taskMachine],
});
