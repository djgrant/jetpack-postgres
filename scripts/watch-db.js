const { promises: fs } = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { Pool } = require("pg");
const sqlWithTsImport = require("./ts-sql");

const rootDir = path.join(__dirname, "../");

const paths = {
  db: path.join(rootDir, "./db"),
  functions: path.join(rootDir, "./db/functions"),
  migrations: path.join(rootDir, "./db/migrations"),
  plv8: path.join(rootDir, "./db/plv8"),
  triggers: path.join(rootDir, "./db/triggers"),
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
  .watch(["functions", "plv8", "triggers"], watcherOptions)
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

async function updateCurrentMigration() {
  console.log("Recompiling the current migration...");

  const getFilePaths = async dir =>
    await fs
      .readdir(dir)
      .then(files => files.map(file => path.join(dir, file)));

  const filePaths = [
    ...(await getFilePaths(paths.functions)),
    ...(await getFilePaths(paths.triggers)),
  ];

  let sqls = ["/*\n  This is a generated file. Do not modify it manually.\n*/"];
  for (const filePath of filePaths) {
    const file = await fs.readFile(filePath, { encoding: "utf-8" });
    const sql = await sqlWithTsImport(file);
    sqls.push(`/*\n  ${filePath.replace(`${paths.db}/`, "")}\n*/\n${sql}`);
  }

  await fs.writeFile(
    path.join(paths.migrations, "current.sql"),
    sqls.join("\n\n")
  );
}
