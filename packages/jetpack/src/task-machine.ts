import { createBaseMachine } from "./machine";
import { Task, Transitions } from "./interfaces";
import * as ops from "./operators";

export interface TaskMachineOptions {
  name: string;
  maxAttempts?: number;
  states?: Transitions;
  task?: Task;
}

const retry = (maxAttempts: number) =>
  ops.condition({
    when: ops.lt(ops.attempts(), maxAttempts),
    then: "ready",
    else: "abandoned",
  });

export const createTaskMachine = ({
  name,
  maxAttempts = 1,
  states,
  task,
}: TaskMachineOptions) =>
  createBaseMachine({
    name: name,
    task,
    initial: "ready",
    states: {
      ...states,
      ready: {
        LOCKED_BY_WORKER: "running",
        ...states?.ready,
      },
      running: {
        ENTER: ops.incrementAttempts(),
        ERROR: "failed",
        SUCCESS: "done",
        ...states?.running,
      },
      failed: {
        ENTER: retry(maxAttempts),
        ...states?.failed,
      },
      done: {
        RERUN_TASK: "ready",
        ...states?.done,
      },
      abandoned: {
        RETRY_TASK: "ready",
        ...states?.abandoned,
      },
    },
  });
