import { Operator } from "./operators";

export interface Transitions {
  [state: string]: {
    onEvent?: TransitionMap;
  };
}

export interface TransitionMap {
  [action: string]: Operator | Operator[];
}
