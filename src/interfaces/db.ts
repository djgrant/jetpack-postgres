import { Pool, PoolConfig } from "pg";

export type DbConnection = Pool | PoolConfig | PoolConfig["connectionString"];

export interface NewTask {
  machineId: string;
  parentId?: string | null;
  params?: {};
  context?: {};
}
