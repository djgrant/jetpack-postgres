import pg from "pg";
import path from "path";
import { promises as fs } from "fs";
import { Jetpack, JetpackOptions } from "@djgrant/jetpack";
import "dotenv/config";

export const connectionString = process.env.TEST_DATABASE_URL;

// until migrations are properly set up
export async function migrate() {
  const pool = new pg.Pool({ connectionString });
  const migrationsDir = path.join(
    __dirname,
    "../../packages/jetpack-db/sql/migrations"
  );
  const migrations = await fs.readdir(migrationsDir);
  await pool.query("drop schema if exists jetpack cascade");
  for (const migration of migrations) {
    const sql = await fs.readFile(path.join(migrationsDir, migration), {
      encoding: "utf-8",
    });
    await pool.query(sql);
  }
  pool.end();
}

export async function setupJetpack(opts: Omit<JetpackOptions, "db">) {
  return new Jetpack({
    db: connectionString,
    logger: () => {},
    ...opts,
  });
}
