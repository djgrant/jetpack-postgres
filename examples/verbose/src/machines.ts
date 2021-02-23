import { createBaseMachine } from "@djgrant/jetpack";

/*
  This is a raw implementation of a task machine for learning purposes.
  In real world apps you would just use createTaskMachine!
*/

export const taskMachine = createBaseMachine({
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
    done: {},
    abandoned: {},
  },
});

taskMachine.onRunning(async () => {
  console.log("Base machine example running!");
});
