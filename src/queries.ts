import { Pool } from "pg";
import { Machine } from "./interfaces";

export async function upsertMachines(machines: Machine[], pool: Pool) {
  const query = `
    insert into jetpack.machines (id, name, def) 
    values ($1, $2, $3)
    on conflict (id) 
    do update set 
      name = excluded.name,
      def = excluded.def;
  `;

  for (const machine of machines) {
    await pool.query(query, [machine.id, machine.name, machine.def]);
    console.log(`Updated machine "${machine.name}"`);
  }
}
