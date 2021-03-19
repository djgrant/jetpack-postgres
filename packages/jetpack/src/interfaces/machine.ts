import { Operator } from "./operators";

export interface Transitions {
  [state: string]: TransitionMap;
}

export interface TransitionMap {
  [action: string]: Operator | Operator[];
}
