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
              type: "iterations",
            },
            right: 5,
          },
          then: "ready",
        },
      },
    },
    done: {},
  },
});

runWorker({
  db: { connectionString: "postgres://danielgrant@localhost:5432/jetpack" },
  machines: [taskMachine],
});
