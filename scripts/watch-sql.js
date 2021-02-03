const fs = require("fs");
const chokidar = require("chokidar");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://danielgrant@localhost:5432/jetpack",
});

const watcher = chokidar.watch(
  ["../sql/functions", "../sql/migrations", "../sql/dev"],
  {
    cwd: __dirname,
    persistent: true,
  }
);

watcher.on("change", update);

function update(changedFile) {
  const dirname = path.join(changedFile, "../");
  fs.readdir(path.join(__dirname, "../sql", dirname), (err, filenames) => {
    if (err) throw err;
    for (const filename of filenames) {
      fs.readFile(
        path.join(__dirname, "../sql", dirname, filename),
        {
          encoding: "utf-8",
        },
        (err, sql) => {
          if (err) {
            console.log(err);
            return;
          }
          pool.query(sql, err => {
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
