import { migrate, connectionString } from "../setup/arrange";
import { Jetpack, createBaseMachine, MachineOptions, ops } from "../../src";
import { Pool } from "pg";

const pool = new Pool({ connectionString });

describe("machine", () => {
  beforeEach(() => migrate());
  afterAll(() => pool.end());

  it("enters the initial state", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "a",
        states: {
          a: {},
        },
      },
      expectedEndState: "a",
      expectedActions: [],
    });
  });

  it("transitions to a new state (string)", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "a",
        states: {
          a: {
            onEvent: {
              ENTER: "b",
            },
          },
          b: {},
        },
      },
      expectedEndState: "b",
      expectedActions: [
        {
          type: "ENTER",
          new_state: "b",
          operations: [
            {
              type: "change_state",
            },
          ],
        },
      ],
    });
  });

  it("transitions to a new state (operator)", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "a",
        states: {
          a: {
            onEvent: {
              ENTER: ops.changeState("b"),
            },
          },
          b: {},
        },
      },
      expectedEndState: "b",
      expectedActions: [
        {
          type: "ENTER",
          new_state: "b",
          operations: [
            {
              type: "change_state",
            },
          ],
        },
      ],
    });
  });

  it("handles conditions", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "initial",
        states: {
          initial: {
            onEvent: {
              ENTER: ops.condition({
                when: true,
                then: ops.changeState("pass"),
                else: ops.changeState("fail"),
              }),
            },
          },
          pass: {},
          fail: {},
        },
      },
      expectedEndState: "pass",
      expectedActions: [
        {
          type: "ENTER",
          old_state: "initial",
          new_state: "pass",
          operations: [
            {
              type: "change_state",
            },
          ],
        },
      ],
    });
  });

  it("traverses multiple states", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "a",
        states: {
          a: {
            onEvent: {
              ENTER: "b",
            },
          },
          b: {
            onEvent: {
              ENTER: "c",
            },
          },
          c: {},
        },
      },
      expectedEndState: "c",
      expectedActions: [
        {
          type: "ENTER",
          previous_state: "a",
          new_state: "b",
          operations: [
            {
              type: "change_state",
              new_state: "b",
            },
          ],
        },
        {
          type: "ENTER",
          previous_state: "b",
          new_state: "c",
          operations: [
            {
              type: "change_state",
              new_state: "c",
            },
          ],
        },
      ],
    });
  });

  async function testMachine({
    machineDef,
    expectedActions,
    expectedEndState,
  }: {
    machineDef: MachineOptions;
    expectedActions?: {}[];
    expectedEndState: string;
  }) {
    const testMachine = createBaseMachine(machineDef);

    testMachine.onRunning(async () => {});

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine],
      logger: () => {},
    });

    await jetpack.createTask({ machine: testMachine });
    await jetpack.runWorkerOnce();
    await jetpack.end();

    if (expectedActions) {
      const { rows: actions } = await pool.query(
        "select * from jetpack.actions where task_id = 1 order by id"
      );

      expect(actions).toMatchObject(expectedActions);
    }

    const { rows: tasks } = await pool.query(
      "select * from jetpack.tasks where id = 1"
    );

    expect(tasks[0].state).toEqual(expectedEndState);
  }
});
