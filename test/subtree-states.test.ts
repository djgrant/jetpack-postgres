import { migrate, connectionString } from "./setup/arrange";
import { Jetpack, createTaskMachine, ops } from "../src";
import { Pool } from "pg";

const pool = new Pool({ connectionString });

describe("subtree states", () => {
  beforeEach(() => migrate());
  afterAll(() => pool.end());

  it("records subtree states", async () => {
    const subTaskMachine = createTaskMachine({
      name: "Sub Task",
      maxAttempts: 3,
    });

    const testMachine = createTaskMachine({
      name: "Test Task",
      maxAttempts: 1,
      states: {
        done: {
          onEvent: {
            ENTER: ops.createSubTask({ machine: subTaskMachine }),
          },
        },
      },
    });

    testMachine.onRunning(async () => {});
    subTaskMachine.onRunning(async task => {
      if (task.attempts < 2) throw new Error();
    });

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine, subTaskMachine],
      logger: () => {},
    });

    await jetpack.createTask({ machine: testMachine });

    await jetpack.runWorkerOnce();
    await jetpack.end();

    const fullTreeStatesTable = await pool.query(
      "select * from jetpack.subtree_states_aggregated(0)"
    );

    const testTaskSubtreeStatesTable = await pool.query(
      "select * from jetpack.subtree_states_aggregated(1)"
    );

    const subTaskSubtreeStatesTable = await pool.query(
      "select * from jetpack.subtree_states_aggregated(2)"
    );

    const getCountsByState = (table: { rows: { state: string }[] }) =>
      table.rows.reduce(
        (acc, row) => ({
          ...acc,
          [row.state]: row,
        }),
        {}
      );

    expect(getCountsByState(fullTreeStatesTable)).toMatchObject({
      total: { children: 1, descendants: 2 },
      done: { children: 1, descendants: 2 },
      ready: { children: 0, descendants: 0 },
      running: { children: 0, descendants: 0 },
      failed: { children: 0, descendants: 0 },
    });

    expect(getCountsByState(testTaskSubtreeStatesTable)).toMatchObject({
      total: { children: 1, descendants: 1 },
      done: { children: 1, descendants: 1 },
      running: { children: 0, descendants: 0 },
      ready: { children: 0, descendants: 0 },
      failed: { children: 0, descendants: 0 },
    });

    expect(getCountsByState(subTaskSubtreeStatesTable)).toMatchObject({
      total: { children: 0, descendants: 0 },
    });
  });
});
