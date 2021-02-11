import { v4 as uuidV4 } from "uuid";
import { ConnectionOptions, TaskRow } from "./interfaces";
import { Db } from "./internal/db";
import { log } from "./internal/utils";
import { POLL_INTERVAL } from "./internal/config";
import { Machine } from "./machine";

export type JetpackOptions = ConnectionOptions;
export interface WorkerOptions {
  machines: Machine[];
}

export class Jetpack {
  db: Db;
  stop: (err: Error) => void;

  constructor(opts: JetpackOptions) {
    this.db = new Db(opts);
    this.stop = (err: Error) => {
      if (err) log(err);
      this.db.end();
      process.exit(err ? 1 : 0);
    };
  }

  runWorker(opts: WorkerOptions) {
    const WORKER_ID = uuidV4();
    log(`Starting worker ${WORKER_ID}`);

    this.runWorkerAsync(opts)
      .then(() => {
        log(`Awaiting tasks to process`);
      })
      .catch(this.stop);
  }

  async runWorkerAsync({ machines }: WorkerOptions) {
    await this.db.upsertMachines(machines);
    const machineCount = machines.length;
    log(
      `Uploaded ${machineCount} state machine${machineCount !== 1 ? "s" : ""}`
    );

    // TODO: Clean up unused machines

    this.pollForTask(task => {
      const machine = machines.find(m => (m.id = task.machine_id));
      if (!machine) {
        throw new Error(`Do not have a machine defined for task: ${task.id}`);
      }
      this.executeTaskHandler(task, machine);
    });
  }

  async pollForTask(onTakeTask: (t: TaskRow) => void) {
    function runTimer() {
      setTimeout(async () => {
        await takeTask();
        runTimer();
      }, POLL_INTERVAL);
    }

    const takeTask = () => {
      return this.db
        .getNextTask()
        .then(task => {
          if (!task) return;
          onTakeTask(task);
        })
        .catch(log);
    };

    // on pg notify new task ready
    // -> clearTimeout(timer);
    // -> await takeTask
    // -> runTimer();

    runTimer();
  }

  async executeTaskHandler(task: TaskRow, machine: Machine) {
    const identifier = `"${machine.name}" (machine ID: ${machine.id}, task ID: ${task.id})`;

    log(`Processing ${identifier}`);

    if (!machine.taskHandler) {
      log(
        `onRunning was not called on machine ${machine.id}. Skipping execution.`
      );
      return;
    }

    try {
      await machine.taskHandler();
      await this.db.dispatchAction("SUCCESS", task);
      log(`Successfully executed ${identifier}`);
    } catch (err) {
      await this.db.dispatchAction("ERROR", task);
      log(`Failed to execute ${identifier}`);
    }
  }
}
