import { ops, createBaseMachine, Jetpack } from "@djgrant/jetpack";
import { migrate, connectionString } from "../setup/arrange";
import { makeMachineTester } from "../setup/assert";
import { Pool } from "pg";

const pool = new Pool({ connectionString });
const testMachine = makeMachineTester(pool);

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

  it.todo("creates sub tasks of current task");
  it.todo("creates sub tasks with params");
  it.todo("creates sub tasks, merging context");
  it.todo("creates root tasks");
  it.todo("creates root tasks with params");
  it.todo("resolves $self to machine ID");
});
