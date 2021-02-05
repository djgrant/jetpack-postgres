import { Pool } from "pg";
import { MachineRow } from "./interfaces";

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
    console.log(`Updated machine "${machine.name}"`);
  }
}
