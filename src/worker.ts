import { ConnectionOpts, Machine } from "./interfaces";
import { getPool } from "./utils";
import { upsertMachines } from "./queries";

interface BaseOpts {
  machines: Machine[];
}

export function runWorker(opts: BaseOpts & ConnectionOpts) {
  const pool = getPool(opts);

  upsertMachines(opts.machines, pool).catch(err => {
    console.log(err);
    console.log("Failed to upsert machines, shutting down worker...");
    process.exit(1);
  });

  // TODO: Clean up unused machines
}
