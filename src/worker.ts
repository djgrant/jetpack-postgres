import { Pool } from "pg";
import { v4 as uuidV4 } from "uuid";
import { ConnectionOpts, TaskRow } from "./interfaces";
import { getPool } from "./internal/db";
import { log } from "./internal/utils";
import { getNextTask, upsertMachines } from "./internal/queries";
import { POLL_INTERVAL } from "./internal/config";
import { Machine } from "./machine";

interface BaseOpts {
  machines: Machine[];
}

export type RunWorkerOpts = BaseOpts & ConnectionOpts;

export function runWorker(opts: RunWorkerOpts) {
  const WORKER_ID = uuidV4();
  log(`Starting worker ${WORKER_ID}`);

  runWorkerAsync(opts)
    .then(() => {
      log(`Awaiting tasks to process`);
    })
    .catch(err => {
      log(err);
      process.exit(1);
    });
}

async function runWorkerAsync(opts: RunWorkerOpts) {
  const pool = getPool(opts);

  await upsertMachines(opts.machines, pool);
  const machineCount = opts.machines.length;
  log(`Uploaded ${machineCount} state machine${machineCount !== 1 ? "s" : ""}`);

  // TODO: Clean up unused machines

  pollForTask(pool, task => {
    const machine = opts.machines.find(m => (m.id = task.machine_id));
    if (!machine) {
      throw new Error(`Do not have a machine defined for task: ${task.id}`);
    }
    machine.execute(task, machine, pool);
  });
}

async function pollForTask(pool: Pool, onTakeTask: (t: TaskRow) => void) {
  function runTimer() {
    setTimeout(async () => {
      await takeTask();
      runTimer();
    }, POLL_INTERVAL);
  }

  function takeTask() {
    return getNextTask(pool)
      .then(task => {
        if (!task) return;
        onTakeTask(task);
      })
      .catch(log);
  }

  // on pg notify new task ready
  // -> clearTimeout(timer);
  // -> await takeTask
  // -> runTimer();

  runTimer();
}
