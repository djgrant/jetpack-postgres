import { Pool, PoolConfig } from "pg";

export interface Machine {
  id: string;
  name: string;
  def: MachineDef;
}

export interface MachineDef {
  [state: string]: {
    onEvent?: Transition;
    onEnter?: Transition;
  };
}

export interface Transition {
  [action: string]: string | Operator;
}

export interface Operator {
  type: string;
  [key: string]: {};
}

export type ConnectionOpts =
  | {
      pool: Pool;
    }
  | {
      db: PoolConfig;
    };
