import { v4 as uuidV4 } from "uuid";
import { Db, DbConnection, NewTask, TaskRow } from "./internal/db";
import { log } from "./internal/utils";
import { POLL_INTERVAL } from "./internal/config";
import { Machine } from "./machine";
import { Execution } from "./internal/execution";

export interface JetpackOptions {
  db: DbConnection;
  machines: Machine[];
  exitOnError?: boolean;
}

export class Jetpack {
  db: Db;
  machines: Machine[];
  readyPromise: Promise<any>;
  exitOnError: boolean;

  constructor(opts: JetpackOptions) {
    this.db = new Db(opts.db);
    this.machines = opts.machines;
    this.readyPromise = this.init().catch(this.stop);
    this.exitOnError = opts.exitOnError || false;
  }

  stop(err?: Error) {
    this.db.end();
    if (err) log(err);
    if (err && this.exitOnError) process.exit(1);
  }

  async init() {
    await this.db.upsertMachines(this.machines);
    const machineCount = this.machines.length;
    log(
      `Uploaded ${machineCount} state machine${machineCount !== 1 ? "s" : ""}`
    );

    // TODO: Clean up unused machines
  }

  async createTask(task: Omit<NewTask, "machineId"> & { machine: Machine }) {
    await this.readyPromise;
    await this.db.createTask({
      machineId: task.machine.id,
      parentId: task.parentId || null,
      params: task.params,
      context: task.params,
    });
  }

  runWorker() {
    this.runWorkerAsync().catch(this.stop);
  }

  async runWorkerAsync() {
    const WORKER_ID = uuidV4();
    log(`Starting worker ${WORKER_ID}`);
    await this.readyPromise;
    this.pollForTask(task => {
      const machine = this.machines.find(m => (m.id = task.machine_id));
      if (!machine) {
        throw new Error(`Do not have a machine defined for task: ${task.id}`);
      }
      this.executeTaskHandler(task, machine);
    });
    log(`Awaiting tasks to process`);
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
        .catch(this.stop);
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

    const execution = new Execution(task);

    try {
      await machine.taskHandler(execution);
      await this.db.dispatchAction("SUCCESS", task);
      log(`Successfully executed ${identifier}`);
    } catch (err) {
      await this.db.dispatchAction("ERROR", task);
      log(err);
      log(`Failed to execute ${identifier}`);
    }
  }
}
