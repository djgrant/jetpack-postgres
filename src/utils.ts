import { Pool } from "pg";
import { ConnectionOpts } from "./interfaces";

export function getPool(opts: ConnectionOpts) {
  let pool: Pool;
  if ("pool" in opts) {
    pool = opts.pool;
  } else {
    pool = new Pool(opts.db);
  }
  return pool;
}

export function log(msg: any, ...rest: any[]) {
  console.log(`[Jetpack]: ${msg}`, ...rest);
}
