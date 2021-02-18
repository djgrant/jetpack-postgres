import { Transitions } from "./machine";
import { EffectOperator } from "./operators";

export interface MachineRow {
  id: string; // uuid
  name: string;
  initial: string;
  transitions: Transitions;
}

export interface ActionRow {
  id: string; // bigint
  task_id: string; // bigint
  type: string;
  payload: Record<string, any>;
  previous_state: string;
  new_state: string;
  operation: EffectOperator;
  timestamp: Date;
}

export interface TaskRow {
  id: string; // bigint
  parent_id: string | null; // bigint
  machine_id: string;
  path: string;
  params: Record<string, any>;
  context: Record<string, any>;
  state: string;
  attempts: number;
  locked: boolean;
}

export interface SubtreeStatesRow {
  task_id: string; // bigint
  state: string;
  children: number;
  descendants: number;
}
