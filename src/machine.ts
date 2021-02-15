import { v5 as uuidV5 } from "uuid";
import { Transitions } from "./interfaces/machine";
import { Execution } from "./internal/execution";

type TaskHandler = (execution: Execution) => Promise<any>;

export interface MachineOptions {
  name: string;
  initial: string;
  states: Transitions;
}

export class Machine {
  id: string;
  name: string;
  initial: string;
  transitions: Transitions;
  taskHandler?: TaskHandler;

  constructor(opts: MachineOptions) {
    this.id = createMachineId(opts);
    this.name = opts.name;
    this.initial = opts.initial;
    this.transitions = opts.states;
    this.taskHandler = undefined;
  }

  onRunning(cb: TaskHandler) {
    this.taskHandler = cb;
    return this;
  }
}

export function createBaseMachine(opts: MachineOptions): Machine {
  return new Machine(opts);
}

export function createMachineId(opts: MachineOptions) {
  const UUID_NAMESPACE = "6a8841e0-7ced-4152-bec6-b0873e38b60b";
  const payload = JSON.stringify(opts.states);
  return uuidV5(opts.name + payload, UUID_NAMESPACE);
}
