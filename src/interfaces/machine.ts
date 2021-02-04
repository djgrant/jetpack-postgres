import { Operator } from "./operators";

export interface Machine {
  id: string;
  name: string;
  def: MachineDef;
}

export interface MachineDef {
  [state: string]: {
    onEvent?: TransitionMap;
    onEnter?: TransitionMap;
  };
}

export interface TransitionMap {
  [action: string]: Operator;
}
