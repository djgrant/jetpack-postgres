import { Transitions } from "./machine";

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
  previous_snapshot: Record<string, any>;
  snapshot: Record<string, any>;
  timestamp: Date;
}

export interface TaskRow {
  id: string; // bigint
  parent_id: string; // bigint
  machine_id: string;
  path: string;
  params: Record<string, any>;
  context: Record<string, any>;
  status: string;
  iterations: number;
  locked: boolean;
}
