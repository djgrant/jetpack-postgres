#!/usr/bin/env ts-node-script
import { createBaseMachine, Jetpack } from "@djgrant/jetpack";

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
        ENTER: {
          type: "create_sub_task",
          machine_id: "$self",
          parent_id: "$self",
        },
      },
    },
    abandoned: {},
  },
});

taskMachine.onRunning(() => {
  console.log("Base machine example running!");
});

const jetpack = new Jetpack({
  db: "postgres://danielgrant@localhost:5432/jetpack",
});

jetpack.runWorker({
  machines: [taskMachine],
});
