import { createMachine, runWorker } from "../src";

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
      onEnter: {
        type: "cond",
        when: {
          type: "lte",
          left: {
            type: "context",
            path: "iterations",
          },
          right: 5,
        },
        then: "ready",
      },
    },
    done: {},
  },
});

runWorker({
  db: { connectionString: "postgres://danielgrant@localhost:5432/jetpack" },
  machines: [taskMachine],
});
