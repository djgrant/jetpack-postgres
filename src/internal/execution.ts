import { TaskRow } from "../interfaces";
import { Db } from "./db";

export class Execution {
  id: string;
  params: {};
  context: {};
  attempts: number;
  db: Db;

  constructor({ task, db }: { task: TaskRow; db: Db }) {
    this.id = task.id;
    this.params = task.params;
    this.context = task.context;
    this.attempts = task.attempts;
    this.db = db;
  }

  setContext(patch: {}) {
    return patch;
  }

  log(...msgs: any[]) {
    console.log(...msgs);
  }
}
