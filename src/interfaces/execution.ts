import { TaskRow } from "./db-schema";

export class Execution {
  id: string;
  params: {};
  context: {};
  attempts: number;

  constructor(task: TaskRow) {
    this.id = task.id;
    this.params = task.params;
    this.context = task.context;
    this.attempts = task.attempts;
  }

  setContext(patch: {}) {
    return patch;
  }

  log(...msgs: any[]) {
    console.log(...msgs);
  }
}

export type TaskHandler = (execution: Execution) => Promise<any>;
