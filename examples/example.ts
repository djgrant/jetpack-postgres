#!/usr/bin/env ts-node-script
import { createMachine, runWorker } from "@djgrant/jetpack";

const taskMachine = createMachine({
  name: "Task machine",
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
          type: "increment-attempts",
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
    done: {},
    abandoned: {},
  },
});

runWorker({
  db: { connectionString: "postgres://danielgrant@localhost:5432/jetpack" },
  machines: [taskMachine],
});
