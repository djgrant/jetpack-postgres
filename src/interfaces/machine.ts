import { EffectOperator, LogicalOperator } from "./operators";
export interface Transitions {
  [state: string]: {
    onEvent?: TransitionMap;
  };
}

export interface TransitionMap {
  [action: string]: Operation | Operation[];
}

export type Operation = EffectOperator | LogicalOperator;
