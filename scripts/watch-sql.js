const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://danielgrant@localhost:5432/jetpack',
});

fs.watch(path.join(__dirname, '../sql'), (eventType, filename) => {
  if (!filename) return;
  fs.readFile(
    path.join(__dirname, '../sql', filename),
    {
      encoding: 'utf-8',
    },
    (err, sql) => {
      if (err) {
        console.log(err);
        return;
      }
      pool.query(sql, err => {
        if (err) {
          console.log(err);
        } else {
          console.log(`Updated ${filename}`);
        }
      });
    }
  );
});
