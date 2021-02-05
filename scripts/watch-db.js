const { promises: fs } = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { Pool } = require("pg");
const sqlWithTsImport = require("./ts-sql");

const paths = {
  db: path.join(__dirname, "../db"),
  plv8: path.join(__dirname, "../db/plv8"),
  migrations: path.join(__dirname, "../db/migrations"),
};

const watcherOptions = {
  cwd: paths.db,
  persistent: true,
};

const pool = new Pool({
  connectionString: "postgres://danielgrant@localhost:5432/jetpack",
});

chokidar
  .watch(["migrations", "dev"], watcherOptions)
  .on("change", runMigration);

chokidar
  .watch(["functions", "plv8"], watcherOptions)
  .on("change", updateCurrentMigration);

async function runMigration(changedFile) {
  const filePath = path.join(paths.db, changedFile);
  const sql = await fs.readFile(filePath, { encoding: "utf-8" });
  try {
    await pool.query(sql);
    console.log(`Updated ${changedFile}`);
  } catch (err) {
    console.log(`Failed to update ${changedFile}`);
    console.log(err);
  }
}

async function updateCurrentMigration(changedFile) {
  let dirname = path.join(changedFile, "../");
  if (dirname.startsWith("plv8")) dirname = "functions";

  console.log("Recompiling the current migration...");

  const filenames = await fs.readdir(path.join(paths.db, dirname));

  let sqls = ["-- Generated current migration"];
  for (const filename of filenames) {
    const filePath = path.join(paths.db, dirname, filename);
    const file = await fs.readFile(filePath, { encoding: "utf-8" });
    const sql = await sqlWithTsImport(file);
    sqls.push(sql);
  }

  await fs.writeFile(
    path.join(paths.migrations, "current.sql"),
    sqls.join("\n\n")
  );
}