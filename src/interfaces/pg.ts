import { Pool, PoolConfig } from "pg";

export type ConnectionOpts =
  | {
      pool: Pool;
    }
  | {
      db: PoolConfig;
    };
