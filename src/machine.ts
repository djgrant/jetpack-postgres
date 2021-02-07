import { Pool } from "pg";
import { v5 as uuidV5 } from "uuid";
import { MachineRow, TaskRow, Transitions } from "./interfaces";
import { dispatchAction } from "./internal/queries";
import { log } from "./internal/utils";

interface Opts {
  name: string;
  initial: string;
  states: Transitions;
}

export class Machine {
  id: string;
  name: string;
  initial: string;
  transitions: Transitions;
  private onRunningCb?: Function;

  constructor(opts: Opts) {
    this.id = createMachineId(opts);
    this.name = opts.name;
    this.initial = opts.initial;
    this.transitions = opts.states;
    this.onRunningCb = undefined;
  }

  onRunning(cb: Function) {
    this.onRunningCb = cb;
    return this;
  }

  async execute(task: TaskRow, machine: MachineRow, pool: Pool) {
    const identifier = `"${machine.name}" (machine ID: ${machine.id}, task ID: ${task.id})`;

    log(`Processing ${identifier}`);

    if (!this.onRunningCb) {
      log(
        `onRunning was not called on machine ${this.id}. Skipping execution.`
      );
      return;
    }

    try {
      await this.onRunningCb();
      await dispatchAction("SUCCESS", task, pool);
      log(`Successfully executed ${identifier}`);
    } catch (err) {
      log(err);
      await dispatchAction("ERROR", task, pool);
      log(`Failed to execute ${identifier}`);
    }
  }
}

export function createMachine(opts: Opts): Machine {
  return new Machine(opts);
}

export function createMachineId(opts: Opts) {
  const UUID_NAMESPACE = "6a8841e0-7ced-4152-bec6-b0873e38b60b";
  const payload = JSON.stringify(opts.states);
  return uuidV5(opts.name + payload, UUID_NAMESPACE);
}
