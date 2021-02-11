import { createBaseMachine } from "./machine";
import { Transitions } from "./interfaces/machine";
import * as ops from "./operators";

export interface TaskMachineOptions {
  name: string;
  maxAttempts: number;
  states?: Transitions;
}

const retry = (maxAttempts: number) =>
  ops.condition({
    when: ops.lt(ops.attempts(), maxAttempts),
    then: "ready",
    else: "abandoned",
  });

export const createTaskMachine = ({
  name,
  maxAttempts,
  states,
}: TaskMachineOptions) =>
  createBaseMachine({
    name: name,
    initial: "ready",
    states: {
      ...states,
      ready: {
        onEvent: {
          LOCKED_BY_WORKER: "running",
          ...states?.ready?.onEvent,
        },
      },
      running: {
        onEvent: {
          ENTER: ops.incrementAttempts(),
          ERROR: "failed",
          SUCCESS: "done",
          ...states?.running?.onEvent,
        },
      },
      failed: {
        onEvent: {
          ENTER: retry(maxAttempts),
          ...states?.failed?.onEvent,
        },
      },
      done: {
        ...states?.done,
      },
      abandoned: {
        ...states?.abandoned,
      },
    },
  });
