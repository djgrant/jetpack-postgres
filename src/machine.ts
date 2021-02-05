import { v5 as uuidv5 } from "uuid";
import { MachineRow, Transitions } from "./interfaces";

const UUID_NAMESPACE = "6a8841e0-7ced-4152-bec6-b0873e38b60b";

interface Opts {
  name: string;
  initial: string;
  states: Transitions;
}

export function createMachine(opts: Opts): MachineRow {
  return {
    id: uuidv5(opts.name + JSON.stringify(opts.states), UUID_NAMESPACE),
    name: opts.name,
    initial: opts.initial,
    transitions: opts.states,
  };
}
