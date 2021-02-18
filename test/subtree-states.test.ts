import { migrate, connectionString } from "./setup/arrange";
import { Jetpack, createTaskMachine, ops, SubtreeStatesRow } from "../src";
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
      "select * from jetpack.get_subtree_states_agg(0)"
    );

    const testTaskSubtreeStatesTable = await pool.query(
      "select * from jetpack.get_subtree_states_agg(1)"
    );

    const subTaskSubtreeStatesTable = await pool.query(
      "select * from jetpack.get_subtree_states_agg(2)"
    );

    const getCountsByState = (table: { rows: SubtreeStatesRow[] }) =>
      table.rows.reduce(
        (acc, { state, children, descendants }) => ({
          ...acc,
          [state]: { children, descendants },
        }),
        {}
      );

    expect(getCountsByState(fullTreeStatesTable)).toEqual({
      total: { children: 1, descendants: 2 },
      done: { children: 1, descendants: 2 },
      ready: { children: 0, descendants: 0 },
      running: { children: 0, descendants: 0 },
      failed: { children: 0, descendants: 0 },
    });

    expect(getCountsByState(testTaskSubtreeStatesTable)).toEqual({
      total: { children: 1, descendants: 1 },
      done: { children: 1, descendants: 1 },
      running: { children: 0, descendants: 0 },
      ready: { children: 0, descendants: 0 },
      failed: { children: 0, descendants: 0 },
    });

    expect(getCountsByState(subTaskSubtreeStatesTable)).toEqual({
      total: { children: 0, descendants: 0 },
    });
  });

  it.todo("deletes hanging subtree states");
});
