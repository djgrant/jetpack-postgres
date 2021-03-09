import { Pool } from "pg";
import { DbConnection, MachineRow, NewTaskRow, TaskRow } from "../interfaces";

export class Db {
  pool: Pool;

  async end() {
    this.pool.end();
  }

  constructor(connection: DbConnection) {
    if (connection instanceof Pool) {
      this.pool = connection;
    } else if (typeof connection === "string") {
      this.pool = new Pool({ connectionString: connection });
    } else {
      this.pool = new Pool(connection);
    }
  }

  async createTask(task: NewTaskRow) {
    const query = "select * from jetpack.create_task($1, $2, $3, $4)";
    await this.pool.query(query, [
      task.machineId,
      task.parentId,
      task.params || {},
      task.context || {},
    ]);
  }

  async setTaskContext(params: { context: {}; taskId: string }) {
    const query = "update jetpack.tasks set context = $1 where id = $2";
    await this.pool.query(query, [params.context, params.taskId]);
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
