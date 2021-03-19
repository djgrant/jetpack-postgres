import { createTaskMachine } from "@djgrant/jetpack";
import { migrate, connectionString, setupJetpack } from "../setup/arrange";
import { Pool } from "pg";

const pool = new Pool({ connectionString });

beforeEach(() => migrate());
afterAll(() => pool.end());

describe("state transitions", () => {
  it("enters the ready state", async () => {
    const taskMachine = createTaskMachine({
      name: "Task Machine",
    });

    const jetpack = await setupJetpack({ machines: [taskMachine] });
    await jetpack.createTask({ machine: taskMachine });

    const { rows: tasks } = await pool.query("select * from jetpack.tasks");

    expect(tasks[0].state).toEqual("ready");
  });

  it("moves to the running state", async () => {
    const taskMachine = createTaskMachine({
      name: "Task Machine",
    });

    const jetpack = await setupJetpack({ machines: [taskMachine] });
    await jetpack.createTask({ machine: taskMachine });
    await jetpack.db.dispatchAction("LOCKED_BY_WORKER", "1");

    const { rows: tasks } = await pool.query("select * from jetpack.tasks");

    expect(tasks[0].state).toEqual("running");
  });

  it("restarts on failed attempts", async () => {
    const taskMachine = createTaskMachine({
      name: "Task Machine",
      maxAttempts: 2,
    });

    const jetpack = await setupJetpack({ machines: [taskMachine] });
    await jetpack.createTask({ machine: taskMachine });
    await jetpack.db.dispatchAction("LOCKED_BY_WORKER", "1");
    await jetpack.db.dispatchAction("ERROR", "1");

    const { rows: tasks } = await pool.query("select * from jetpack.tasks");

    expect(tasks[0].state).toEqual("ready");
  });

  it("is abadoned after max attempts exceeded", async () => {
    const taskMachine = createTaskMachine({
      name: "Task Machine",
      maxAttempts: 2,
    });

    const jetpack = await setupJetpack({ machines: [taskMachine] });
    await jetpack.createTask({ machine: taskMachine });
    await jetpack.db.dispatchAction("LOCKED_BY_WORKER", "1");
    await jetpack.db.dispatchAction("ERROR", "1");
    await jetpack.db.dispatchAction("LOCKED_BY_WORKER", "1");
    await jetpack.db.dispatchAction("ERROR", "1");

    const { rows: tasks } = await pool.query("select * from jetpack.tasks");

    expect(tasks[0].state).toEqual("abandoned");
  });

  it("moves to done on success", async () => {
    const taskMachine = createTaskMachine({
      name: "Task Machine",
      maxAttempts: 2,
    });

    const jetpack = await setupJetpack({ machines: [taskMachine] });
    await jetpack.createTask({ machine: taskMachine });
    await jetpack.db.dispatchAction("LOCKED_BY_WORKER", "1");
    await jetpack.db.dispatchAction("SUCCESS", "1");

    const { rows: tasks } = await pool.query("select * from jetpack.tasks");

    expect(tasks[0].state).toEqual("done");
  });

  it("retries", async () => {
    const taskMachine = createTaskMachine({
      name: "Task Machine",
    });

    const jetpack = await setupJetpack({ machines: [taskMachine] });
    await jetpack.createTask({ machine: taskMachine });
    await jetpack.db.dispatchAction("LOCKED_BY_WORKER", "1");
    await jetpack.db.dispatchAction("ERROR", "1");
    await jetpack.db.dispatchAction("RETRY_TASK", "1");

    const { rows: tasks } = await pool.query("select * from jetpack.tasks");

    expect(tasks[0].state).toEqual("ready");
  });

  it("reruns", async () => {
    const taskMachine = createTaskMachine({
      name: "Task Machine",
    });

    const jetpack = await setupJetpack({ machines: [taskMachine] });
    await jetpack.createTask({ machine: taskMachine });
    await jetpack.db.dispatchAction("LOCKED_BY_WORKER", "1");
    await jetpack.db.dispatchAction("SUCCESS", "1");
    await jetpack.db.dispatchAction("RERUN_TASK", "1");

    const { rows: tasks } = await pool.query("select * from jetpack.tasks");

    expect(tasks[0].state).toEqual("ready");
  });
});
