const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const ts = require("typescript");
const requireFromString = require("require-from-string");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://danielgrant@localhost:5432/jetpack",
});

const watcher = chokidar.watch(["functions", "migrations", "dev", "plv8"], {
  cwd: path.join(__dirname, "../db"),
  persistent: true,
});

watcher.on("change", update);

function update(changedFile) {
  let dirname = path.join(changedFile, "../");
  if (dirname.startsWith("plv8")) dirname = "functions";
  fs.readdir(path.join(__dirname, "../db", dirname), (err, filenames) => {
    if (err) throw err;
    for (const filename of filenames) {
      fs.readFile(
        path.join(__dirname, "../db", dirname, filename),
        {
          encoding: "utf-8",
        },
        (err, sql) => {
          if (err) {
            console.log(err);
            return;
          }
          pool.query(withTypeScripts(sql), err => {
            if (err) {
              console.log(`Failed to update ${filename}`);
              console.log(err);
            } else {
              console.log(`Updated ${filename}`);
            }
          });
        }
      );
    }
  });
}

function withTypeScripts(sql) {
  return sql.replace(/:import_ts\(['"](.+)['"]\)/gm, (_, filename) => {
    const filePath = path.resolve(__dirname, "../db/plv8", filename + ".ts");
    const file = fs.readFileSync(filePath, { encoding: "utf-8" });
    const code = ts.transpileModule(file, {}).outputText;
    const module = requireFromString(code);
    return `return (${module.default.toString()})();`;
  });
}
