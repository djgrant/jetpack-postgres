import { evaluateOperation } from "../../db/plv8/interpreter";
import { ops, TaskRow } from "../../src";

Object.defineProperty(global, "plv8", {
  value: {
    prepare: () => {},
  },
});

const task: TaskRow = {
  id: "1",
  parent_id: null,
  path: "1",
  machine_id: "guid",
  params: {},
  context: {},
  attempts: 1,
  state: "pending",
};

const PASS = ops.changeState("pass");
const FAIL = ops.changeState("fail");
const NOOP = ops.noOp();

describe("syntactic sugar", () => {
  it("returns a string as change_state operator", () => {
    const operation = "new_state";
    const result = evaluateOperation(operation, task);
    expect(result).toEqual(ops.changeState("new_state"));
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

describe("binary operators", () => {
  it("eq", () => {
    const operation = ops.condition({
      when: ops.eq(ops.attempts(), 10),
      then: "pass",
      else: "fail",
    });

    const passResults = [
      evaluateOperation(operation, { ...task, attempts: 10 }),
    ];

    const failResults = [
      evaluateOperation(operation, { ...task, attempts: -10 }),
      evaluateOperation(operation, { ...task, attempts: 9 }),
      evaluateOperation(operation, { ...task, attempts: 11 }),
    ];

    passResults.forEach(result => expect(result).toEqual(PASS));
    failResults.forEach(result => expect(result).toEqual(FAIL));
  });

  it("lte", () => {
    const operation = ops.condition({
      when: ops.lte(ops.attempts(), 10),
      then: "pass",
      else: "fail",
    });

    const passResults = [
      evaluateOperation(operation, { ...task, attempts: -10 }),
      evaluateOperation(operation, { ...task, attempts: 9 }),
      evaluateOperation(operation, { ...task, attempts: 10 }),
    ];

    const failResults = [
      evaluateOperation(operation, { ...task, attempts: 11 }),
      evaluateOperation(operation, { ...task, attempts: 111 }),
    ];

    passResults.forEach(result => expect(result).toEqual(PASS));
    failResults.forEach(result => expect(result).toEqual(FAIL));
  });
});

describe("no ops", () => {
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
      expect(result).toEqual(NOOP);
    });
  });
});
