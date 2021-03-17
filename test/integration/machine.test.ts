import { ops, createBaseMachine } from "@djgrant/jetpack";
import { migrate, connectionString } from "../setup/arrange";
import { makeMachineTester, makeWorkerRunner } from "../setup/assert";
import { Pool } from "pg";

const pool = new Pool({ connectionString });
const testMachine = makeMachineTester(pool);
const runTestWorker = makeWorkerRunner(pool);

beforeEach(() => migrate());
afterAll(() => pool.end());

describe("state transitions", () => {
  it("enters the initial state", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "a",
        states: {
          a: {},
        },
      },
      expectedTask: { state: "a" },
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
      expectedTask: { state: "b" },
      expectedActions: [
        {
          type: "ENTER",
          new_state: "b",
          operations: [
            {
              type: "change_state",
              new_state: "b",
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
      expectedTask: { state: "b" },
      expectedActions: [
        {
          type: "ENTER",
          new_state: "b",
          operations: [
            {
              type: "change_state",
              new_state: "b",
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
      expectedTask: { state: "c" },
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
});

describe("non-trivial machines", () => {
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
      expectedTask: { state: "pass" },
      expectedActions: [
        {
          type: "ENTER",
          previous_state: "initial",
          new_state: "pass",
          operations: [
            {
              type: "change_state",
              new_state: "pass",
            },
          ],
        },
      ],
    });
  });
});

describe("multiple operations", () => {
  it("handles multiple operations", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "a",
        states: {
          a: {
            onEvent: {
              ENTER: [
                ops.changeState("b"),
                ops.dispatchActionToParent("ACTION_1"),
                ops.dispatchActionToRoot("ACTION_2"),
              ],
            },
          },
          b: {},
        },
      },
      expectedTask: { state: "b" },
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
            {
              type: "dispatch_action_to_parent",
              action: "ACTION_1",
            },
            {
              type: "dispatch_action_to_root",
              action: "ACTION_2",
            },
          ],
        },
      ],
    });
  });
});

describe("effects", () => {
  it("increments attempts", async () => {
    await testMachine({
      machineDef: {
        name: "Test Task",
        initial: "a",
        states: {
          a: {
            onEvent: {
              ENTER: ops.incrementAttempts(),
            },
          },
        },
      },
      expectedTask: { state: "a" },
      expectedActions: [
        {
          type: "ENTER",
          previous_state: "a",
          new_state: "a",
          operations: [{ type: "increment_attempts" }],
        },
      ],
    });
  });

  it("creates sub tasks of current task", async () => {
    const subMachine = createBaseMachine({
      name: "Sub Machine",
      initial: "a",
      states: {},
    });

    const rootMachine = createBaseMachine({
      name: "Root Machine",
      initial: "a",
      states: {
        a: {
          onEvent: {
            ENTER: ops.createSubTask({ machine: subMachine }),
          },
        },
      },
    });

    const { tasks } = await runTestWorker([rootMachine, subMachine], jetpack =>
      jetpack.createTask({ machine: rootMachine })
    );

    expect(tasks).toMatchObject([
      { id: "1", machine_id: rootMachine.id, parent_id: null },
      { id: "2", machine_id: subMachine.id, parent_id: "1" },
    ]);
  });

  it("creates sub tasks with params", async () => {
    const subMachine = createBaseMachine({
      name: "Sub Machine",
      initial: "a",
      states: {},
    });

    const rootMachine = createBaseMachine({
      name: "Root Machine",
      initial: "a",
      states: {
        a: {
          onEvent: {
            ENTER: ops.createSubTask({
              machine: subMachine,
              params: { a: 1, b: { c: 2 } },
            }),
          },
        },
      },
    });

    const { tasks } = await runTestWorker([rootMachine, subMachine], jetpack =>
      jetpack.createTask({ machine: rootMachine })
    );

    expect(tasks).toMatchObject([
      {
        id: "1",
        machine_id: rootMachine.id,
        parent_id: null,
        params: {},
      },
      {
        id: "2",
        machine_id: subMachine.id,
        parent_id: "1",
        params: { a: 1, b: { c: 2 } },
      },
    ]);
  });

  it("creates sub tasks, shallow merging context", async () => {
    const subMachine = createBaseMachine({
      name: "Sub Machine",
      initial: "a",
      states: {},
    });

    const rootMachine = createBaseMachine({
      name: "Root Machine",
      initial: "a",
      states: {
        a: {
          onEvent: {
            ENTER: ops.createSubTask({
              machine: subMachine,
              context: { a: 2, b: { e: 4 }, f: 5 },
            }),
          },
        },
      },
    });

    const { tasks } = await runTestWorker([rootMachine, subMachine], jetpack =>
      jetpack.createTask({
        machine: rootMachine,
        context: { a: 1, b: { c: 2 }, d: 3 },
      })
    );

    expect(tasks).toMatchObject([
      {
        id: "1",
        machine_id: rootMachine.id,
        parent_id: null,
        context: { a: 1, b: { c: 2 }, d: 3 },
      },
      {
        id: "2",
        machine_id: subMachine.id,
        parent_id: "1",
        context: { a: 2, b: { e: 4 }, d: 3, f: 5 },
      },
    ]);
  });

  it("creates root tasks", async () => {
    const adjacentMachine = createBaseMachine({
      name: "Sub Machine",
      initial: "a",
      states: {},
    });

    const rootMachine = createBaseMachine({
      name: "Root Machine",
      initial: "a",
      states: {
        a: {
          onEvent: {
            ENTER: ops.createRootTask({ machine: adjacentMachine }),
          },
        },
      },
    });

    const { tasks } = await runTestWorker(
      [rootMachine, adjacentMachine],
      jetpack =>
        jetpack.createTask({
          machine: rootMachine,
        })
    );

    expect(tasks).toMatchObject([
      {
        id: "1",
        machine_id: rootMachine.id,
        parent_id: null,
      },
      {
        id: "2",
        machine_id: adjacentMachine.id,
        parent_id: null,
      },
    ]);
  });

  it("creates root tasks with params", async () => {
    const adjacentMachine = createBaseMachine({
      name: "Sub Machine",
      initial: "a",
      states: {},
    });

    const rootMachine = createBaseMachine({
      name: "Root Machine",
      initial: "a",
      states: {
        a: {
          onEvent: {
            ENTER: ops.createRootTask({
              machine: adjacentMachine,
              params: { a: 1 },
            }),
          },
        },
      },
    });

    const { tasks } = await runTestWorker(
      [rootMachine, adjacentMachine],
      jetpack =>
        jetpack.createTask({
          machine: rootMachine,
        })
    );

    expect(tasks).toMatchObject([
      {
        id: "1",
        machine_id: rootMachine.id,
        parent_id: null,
      },
      {
        id: "2",
        machine_id: adjacentMachine.id,
        parent_id: null,
        params: { a: 1 },
      },
    ]);
  });

  it("resolves $self to machine ID", async () => {
    const rootMachine = createBaseMachine({
      name: "Root Machine",
      initial: "a",
      states: {
        a: {
          onEvent: {
            ENTER: ops.condition({
              when: ops.params("isRoot"),
              then: ops.createSubTask({
                machine: ops.self(),
                params: { isRoot: false },
              }),
            }),
          },
        },
      },
    });

    const { tasks } = await runTestWorker([rootMachine], jetpack =>
      jetpack.createTask({ machine: rootMachine, params: { isRoot: true } })
    );

    expect(tasks).toMatchObject([
      {
        id: "1",
        machine_id: rootMachine.id,
        parent_id: null,
      },
      {
        id: "2",
        machine_id: rootMachine.id,
        parent_id: "1",
      },
    ]);
  });
});
