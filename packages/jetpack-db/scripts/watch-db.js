const { promises: fs } = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { Pool } = require("pg");
const sqlWithTsImport = require("./ts-sql");

const rootDir = path.join(__dirname, "../");

const paths = {
  root: rootDir,
  sql: path.join(rootDir, "./sql"),
  functions: path.join(rootDir, "./sql/functions"),
  migrations: path.join(rootDir, "./sql/migrations"),
  triggers: path.join(rootDir, "./sql/triggers"),
};

const watcherOptions = {
  cwd: paths.root,
  persistent: true,
};

const pool = new Pool({
  connectionString: "postgres://danielgrant@localhost:5432/jetpack",
});

chokidar.watch(["sql/migrations"], watcherOptions).on("change", runMigration);

chokidar
  .watch(["sql/functions", "sql/triggers", "src"], watcherOptions)
  .on("change", updateCurrentMigration);

async function runMigration(changedFile) {
  const filePath = path.join(paths.root, changedFile);
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
