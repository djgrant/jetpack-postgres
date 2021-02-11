import { Pool } from "pg";
import { ConnectionOptions, MachineRow, TaskRow } from "../interfaces";

export class Db {
  pool: Pool;

  async end() {
    this.pool.end();
  }

  constructor(opts: ConnectionOptions) {
    if ("pool" in opts) {
      this.pool = opts.pool;
    } else {
      this.pool = new Pool(
        typeof opts.db === "string" ? { connectionString: opts.db } : opts.db
      );
    }
  }

  async dispatchAction(actionType: string, task: TaskRow) {
    const query = "select * from jetpack.dispatch_action($1, $2)";
    await this.pool.query(query, [task.id, actionType]);
  }

  async upsertMachines(machines: MachineRow[]) {
    const query = `
      insert into jetpack.machines (id, name, initial, transitions) 
      values ($1, $2, $3, $4)
      on conflict (id) 
      do update set 
        name = excluded.name,
        transitions = excluded.transitions;
    `;

    for (const machine of machines) {
      await this.pool.query(query, [
        machine.id,
        machine.name,
        machine.initial,
        machine.transitions,
      ]);
    }
  }

  async getNextTask(): Promise<TaskRow | null> {
    const result = await this.pool.query(
      "select * from jetpack.get_next_task()"
    );
    const task = result.rows[0];
    if (!task.id) return null;
    return task;
  }
}
