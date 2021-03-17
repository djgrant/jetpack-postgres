import { TaskRow } from "../interfaces";
import { Db } from "./db";

type Options = {
  task: TaskRow;
  db: Db;
};

export class Execution {
  id: string;
  params: {};
  context: {};
  attempts: number;
  db: Db;

  constructor({ task, db }: Options) {
    this.id = task.id;
    this.params = task.params;
    this.context = task.context;
    this.attempts = task.attempts;
    this.db = db;
  }

  setContext = (patch: {}) => {
    this.db.setTaskContext({ context: patch, taskId: this.id });
    return patch;
  };

  log(...msgs: any[]) {
    console.log(...msgs);
  }
}
