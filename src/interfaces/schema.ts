export interface MachineRow {
  id: string; // uuid
  name: string;
  def: {};
}

export interface ActionRow {
  id: string; // bigint
  task_id: string; // bigint
  type: string;
  payload: {};
  previous_snapshot: {};
  snapshot: {};
  timestamp: Date;
}

export interface TaskRow {
  id: string; // bigint
  parent_id: string; // bigint
  machine_id: string;
  path: string;
  params: {};
  context: {};
  status: string;
  iterations: number;
  locked: boolean;
}
