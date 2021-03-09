import { migrate, connectionString } from "../setup/arrange";
import { Jetpack, createBaseMachine } from "../../src";
import { Pool } from "pg";

const pool = new Pool({ connectionString });

describe("machine", () => {
  beforeEach(() => migrate());
  afterAll(() => pool.end());

  it("dispatches no lifecyle actions if none specified", async () => {
    const testMachine = createBaseMachine({
      name: "Test Task",
      initial: "a",
      states: {
        a: {
          onEvent: {
            TEST_ACTION: "b",
          },
        },
        b: {},
      },
    });

    testMachine.onRunning(async () => {});

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine],
      logger: () => {},
    });

    await jetpack.createTask({ machine: testMachine });
    await jetpack.db.dispatchAction("TEST_ACTION", "1");
    await jetpack.runWorkerOnce();
    await jetpack.end();

    const { rows: actions } = await pool.query(
      "select * from jetpack.actions where task_id = 1 order by id"
    );

    expect(actions.some(action => action.type === "ENTER")).toBe(false);
    expect(actions.some(action => action.type === "EXIT")).toBe(false);
  });

  it("dispatches an ENTER action when specified", async () => {
    const testMachine = createBaseMachine({
      name: "Test Task",
      initial: "a",
      states: {
        a: {
          onEvent: {
            ENTER: "a",
          },
        },
      },
    });

    testMachine.onRunning(async () => {});

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine],
      logger: () => {},
    });

    await jetpack.createTask({ machine: testMachine });
    await jetpack.runWorkerOnce();
    await jetpack.end();

    const { rows: actions } = await pool.query(
      "select * from jetpack.actions where task_id = 1 order by id"
    );

    expect(actions).toMatchObject([
      {
        type: "ENTER",
        task_id: "1",
        previous_state: "a",
        new_state: "a",
      },
    ]);
  });

  it.todo("dispatches an EXIT action when specified");
});
