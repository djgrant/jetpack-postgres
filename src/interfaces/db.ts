import { Pool, PoolConfig } from "pg";

export type ConnectionOptions =
  | {
      pool: Pool;
    }
  | {
      db: PoolConfig | PoolConfig["connectionString"];
    };

export interface NewTask {
  machineId: string;
  parentId?: string | null;
  params?: {};
  context?: {};
}
