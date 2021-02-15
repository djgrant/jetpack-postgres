import { TaskRow } from "../interfaces";

export class Execution {
  id: string;
  params: {};
  context: {};

  constructor(task: TaskRow) {
    this.id = task.id;
    this.params = task.params;
    this.context = task.context;
  }

  setContext(patch: {}) {
    return patch;
  }

  log(...msgs: any[]) {
    console.log(...msgs);
  }
}
