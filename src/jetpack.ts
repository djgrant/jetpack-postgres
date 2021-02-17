import { v4 as uuidV4 } from "uuid";
import { Db, DbConnection, NewTask, TaskRow } from "./internal/db";
import { log } from "./internal/utils";
import { POLL_INTERVAL } from "./internal/config";
import { Machine } from "./machine";
import { Execution } from "./internal/execution";

type Logger = (...msgs: any) => void;

export interface JetpackOptions {
  db: DbConnection;
  machines: Machine[];
  logger?: Logger;
}

export class Jetpack {
  db: Db;
  machines: Machine[];
  readyPromise: Promise<any>;
  workerPromise: Promise<any>;
  log: Logger;
  timer?: NodeJS.Timeout;

  constructor(opts: JetpackOptions) {
    this.db = new Db(opts.db);
    this.machines = opts.machines;
    this.log = opts.logger || log;
    this.workerPromise = Promise.resolve();
    this.readyPromise = this.init().catch(err => this.end(err));
  }

  async init() {
    await this.db.upsertMachines(this.machines);
    const machineCount = this.machines.length;
    this.log(
      `Uploaded ${machineCount} state machine${machineCount !== 1 ? "s" : ""}`
    );

    // TODO: Clean up unused machines
  }

  async end(err?: Error) {
    if (err) this.log(err);
    await this.readyPromise;
    await this.stopWorker();
    this.db.end();
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
    this.runWorkerPolling().catch(this.end);
  }

  async stopWorker() {
    if (this.timer) clearTimeout(this.timer);
    await this.workerPromise;
  }

  async runWorkerOnce() {
    await this.readyPromise;
    while (true) {
      const task = await this.db.getNextTask();
      if (!task) break;
      await this.processTask(task);
    }
  }

  async runWorkerPolling() {
    const WORKER_ID = uuidV4();
    this.log(`Starting worker ${WORKER_ID}`);
    await this.readyPromise;
    this.log(`Awaiting tasks to process`);
    const runTimer = () => {
      this.timer = setTimeout(async () => {
        this.workerPromise = this.runWorkerOnce().catch(this.log);
        await this.workerPromise;
        runTimer();
      }, POLL_INTERVAL);
    };
    runTimer();
  }

  private async processTask(task: TaskRow) {
    const machine = this.machines.find(m => m.id === task.machine_id);
    if (!machine) {
      throw new Error(`Do not have a machine defined for task: ${task.id}`);
    }
    await this.executeTaskHandler(task, machine);
  }

  async executeTaskHandler(task: TaskRow, machine: Machine) {
    const identifier = `"${machine.name}" (machine ID: ${machine.id}, task ID: ${task.id})`;

    this.log(`Processing ${identifier}`);

    if (!machine.taskHandler) {
      this.log(
        `onRunning was not called on machine ${machine.id}. Skipping execution.`
      );
      return;
    }

    const execution = new Execution(task);

    try {
      await machine.taskHandler(execution);
      await this.db.dispatchAction("SUCCESS", task);
      this.log(`Successfully executed ${identifier}`);
    } catch (err) {
      await this.db.dispatchAction("ERROR", task);
      this.log(err);
      this.log(`Failed to execute ${identifier}`);
    }
  }
}
