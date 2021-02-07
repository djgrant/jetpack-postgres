import { Pool } from "pg";
import { MachineRow, TaskRow } from "../interfaces";

export async function dispatchAction(
  actionType: string,
  task: TaskRow,
  pool: Pool
) {
  const query = "select * from jetpack.dispatch_action($1, $2)";
  await pool.query(query, [task.id, actionType]);
}

export async function upsertMachines(machines: MachineRow[], pool: Pool) {
  const query = `
    insert into jetpack.machines (id, name, initial, transitions) 
    values ($1, $2, $3, $4)
    on conflict (id) 
    do update set 
      name = excluded.name,
      transitions = excluded.transitions;
  `;

  for (const machine of machines) {
    await pool.query(query, [
      machine.id,
      machine.name,
      machine.initial,
      machine.transitions,
    ]);
  }
}

export async function getNextTask(pool: Pool): Promise<TaskRow | null> {
  const result = await pool.query("select * from jetpack.get_next_task()");
  const task = result.rows[0];
  if (!task.id) return null;
  return task;
}
