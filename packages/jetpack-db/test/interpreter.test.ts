import { ops, TaskRow } from "@djgrant/jetpack";
import { evaluateOperation } from "../src/interpreter";

declare const global: { plv8: any };

global.plv8 = {
  prepare: () => ({
    execute: () => [{ state: "pending", descendants: 10 }],
  }),
};

const task: TaskRow = {
  id: "1",
  parent_id: null,
  path: "1",
  machine_id: "guid",
  params: {},
  context: {},
  attempts: 2,
  state: "pending",
};

const PASS = ops.changeState("pass");
const FAIL = ops.changeState("fail");
const NOOP = ops.noOp();
const noOpValue = (v: any) => ops.noOp(ops.value(v));

describe("syntatic sugar", () => {
  it("returns a string as change_state operator", () => {
    const operation = "new_state";
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(ops.changeState("new_state"));
  });
});

describe("illegal operations", () => {
  it("returns an error when an effect is passed instead of a value", () => {
    const testCases = [
      ops.dispatchActionToRoot(
        "TEST",
        ops.createSubTask({ machine: ops.self() })
      ),
      ops.eq(
        ops.value(1),
        ops.condition({
          when: true,
          then: ops.createSubTask({ machine: { id: "$self" } }),
        })
      ),
    ];

    testCases.forEach(operation => {
      const result = evaluateOperation(operation, task);
      expect(result).toEqual(
        ops.error("Error: Operator must ulimately return a value type")
      );
    });
  });

  it("returns a no op effect if the resulting operator is not an effect", () => {
    const operations = [
      null,
      1,
      ops.value("pass"),
      ops.value(null),
      ops.eq(1, 2),
      ops.condition({ when: true, then: 1 }),
    ];
    operations.forEach(operation => {
      const result = evaluateOperation(operation, task);
      expect(result).toMatchObject({ type: "no_op" });
    });
  });
});

describe("effects", () => {
  it("returns valid effects", () => {
    [
      ops.changeState("new_state"),
      ops.createRootTask({ machine: ops.self() }),
      ops.createSubTask({ machine: ops.self() }),
      ops.dispatchActionToParent("TEST"),
      ops.dispatchActionToRoot("TEST"),
      ops.dispatchActionToSiblings("TEST"),
      ops.error("Boo"),
      ops.incrementAttempts(),
      ops.noOp(),
    ].forEach(effect => {
      const result = evaluateOperation(effect, task);
      expect(result).toEqual(effect);
    });
  });

  it("handles actions with no payload", () => {
    const operation = ops.dispatchActionToParent("TEST");
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(ops.dispatchActionToParent("TEST"));
  });

  it("handles actions with a payload", () => {
    const operation = ops.dispatchActionToParent("TEST", 1);
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(ops.dispatchActionToParent("TEST", 1));
  });

  it("unpacks expressions inside actions", () => {
    const testCases = [
      [
        ops.dispatchActionToParent("TEST", ops.value(1)),
        ops.dispatchActionToParent("TEST", 1),
      ],
      [
        ops.dispatchActionToRoot("TEST", ops.value("hello")),
        ops.dispatchActionToRoot("TEST", "hello"),
      ],
      [
        ops.dispatchActionToSiblings("TEST", ops.eq(1, 2)),
        ops.dispatchActionToSiblings("TEST", false),
      ],
    ];

    testCases.forEach(([operation, expected]) => {
      const result = evaluateOperation(operation, task);
      expect(result).toEqual(expected);
    });
  });
});

describe("getters", () => {
  test("depth", () => {
    const cases = [
      { path: "1", depth: 1 },
      { path: "1.2.3.4", depth: 4 },
      { path: "1.4.8.19.23.100", depth: 6 },
    ];
    cases.forEach(({ path, depth }) => {
      const operation = ops.depth();
      const result = evaluateOperation(operation, { ...task, path });
      expect(result).toEqual(noOpValue(depth));
    });
  });

  test("attempts", () => {
    const operation = ops.attempts();
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(noOpValue(2));
  });

  test("params", () => {
    const operation = ops.params();
    const result = evaluateOperation(operation, {
      ...task,
      params: { a: { b: 1 } },
    });
    expect(result).toEqual(noOpValue({ a: { b: 1 } }));
  });

  test("params at path", () => {
    const operation = ops.params("a");
    const result = evaluateOperation(operation, {
      ...task,
      params: { a: { b: 1 } },
    });
    expect(result).toEqual(noOpValue({ b: 1 }));
  });

  test("context", () => {
    const operation = ops.context();
    const result = evaluateOperation(operation, {
      ...task,
      context: { a: { b: 1 } },
    });
    expect(result).toEqual(noOpValue({ a: { b: 1 } }));
  });

  test("context at path", () => {
    const operation = ops.context("a");
    const result = evaluateOperation(operation, {
      ...task,
      context: { a: { b: 1 } },
    });
    expect(result).toEqual(noOpValue({ b: 1 }));
  });
});

describe("conditions", () => {
  it("evaluates a condition's then branch", () => {
    const operation = ops.condition({
      when: true,
      then: "pass",
      else: "fail",
    });
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(PASS);
  });

  it("evaluates a condition's else branch", () => {
    const operation = ops.condition({
      when: false,
      then: "pass",
      else: "fail",
    });
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(FAIL);
  });

  it("evaluates to a no-op if no else branch is provided", () => {
    const operation = ops.condition({
      when: false,
      then: "pass",
    });
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(NOOP);
  });
});

describe("logical operators", () => {
  test("all", () => {
    const testCases = [
      { args: [ops.eq(2, 2)], expected: true },
      { args: [ops.eq(1, 2)], expected: false },
      { args: [ops.value(false)], expected: false },
      { args: [false], expected: false },
      { args: [true], expected: true },
      { args: [true, true], expected: true },
      { args: [true, false], expected: false },
      { args: [true, true, true], expected: true },
      { args: [true, false, true], expected: false },
      { args: [false, false, false], expected: false },
    ];
    testCases.forEach(({ args, expected }) => {
      const operation = ops.all(...args);
      const result = evaluateOperation(operation, task);
      expect(result).toEqual(noOpValue(expected));
    });
  });

  test("any", () => {
    const testCases = [
      { args: [ops.eq(2, 2)], expected: true },
      { args: [ops.eq(1, 2)], expected: false },
      { args: [ops.value(false)], expected: false },
      { args: [false], expected: false },
      { args: [true], expected: true },
      { args: [true, true], expected: true },
      { args: [true, false], expected: true },
      { args: [true, true, true], expected: true },
      { args: [true, false, true], expected: true },
      { args: [false, false, false], expected: false },
    ];
    testCases.forEach(({ args, expected }) => {
      const operation = ops.any(...args);
      const result = evaluateOperation(operation, task);
      expect(result).toEqual(noOpValue(expected));
    });
  });

  test("not", () => {
    const testCases = [
      { value: true, expected: false },
      { value: 1, expected: false },
      { value: ops.value(1), expected: false },
      { value: ops.value(0), expected: true },
      { value: ops.value(null), expected: true },
      {
        value: ops.eq(1, 2),
        expected: true,
      },
      {
        value: ops.condition({ when: false, then: 0, else: 1 }),
        expected: false,
      },
    ];
    testCases.forEach(({ value, expected }) => {
      const operation = ops.not(value);
      const result = evaluateOperation(operation, task);
      expect(result).toEqual(noOpValue(expected));
    });
  });
});

describe("comparison operators", () => {
  const testCases = [
    { op: "eq", pass: [10], fail: [-10, 9, 11] },
    { op: "notEq", pass: [-10, 9, 11], fail: [10] },
    { op: "lte", pass: [-10, 9, 10], fail: [11, 111] },
    { op: "lt", pass: [-10, 9], fail: [10, 11, 111] },
    { op: "gt", pass: [11, 111], fail: [-10, 9, 10] },
    { op: "gte", pass: [10, 11, 111], fail: [9, -9, 0] },
  ];

  testCases.forEach(testCase => {
    test(testCase.op, () => {
      const toResult = (num: number) => {
        const op = ops[testCase.op as keyof typeof ops] as (
          ...args: any[]
        ) => any;
        return evaluateOperation(op(num, 10), task);
      };

      const passResults = testCase.pass.map(toResult);
      const failResults = testCase.fail.map(toResult);

      passResults.forEach(result => expect(result).toEqual(noOpValue(true)));
      failResults.forEach(result => expect(result).toEqual(noOpValue(false)));
    });
  });
});

describe("arithmetic operators", () => {
  test("sum", () => {
    const operation = ops.sum(1, 2, 3);
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(noOpValue(6));
  });
});

describe("subtree operators", () => {
  test("count by state", () => {
    const operation = ops.subtree.count("pending");
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(noOpValue(10));
  });
});
