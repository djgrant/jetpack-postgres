import {
  ops,
  Comparable,
  Operator,
  ValueOperator,
  EffectOperator,
  TaskRow,
} from "@djgrant/jetpack";

export function evaluateOperator(
  operator: Operator,
  task: TaskRow
): EffectOperator {
  function evalOp(op: Operator): Operator {
    if (typeof op === "string") {
      return { type: "change-status", newStatus: op };
    }

    if (op.type === "condition") {
      const when = evalOp(op.when);
      if (!isValueOperator(when)) throwValueOpError();
      const isPass = Boolean(when.value);
      return isPass
        ? evalOp(op.then)
        : op.else
        ? evalOp(op.else)
        : { type: "no-op" };
    }

    if (op.type === "lte") {
      const left = evalComparable(op.left);
      const right = evalComparable(op.right);
      if (!isValueOperator(left)) throwValueOpError();
      if (!isValueOperator(right)) throwValueOpError();
      return ops.value(left.value === right.value);
    }

    if (op.type === "params") {
      return ops.value(task.params[op.path]);
    }

    if (op.type === "context") {
      return ops.value(task.params[op.path]);
    }

    return op;
  }

  function evalComparable(input: Comparable) {
    if (input !== null && typeof input === "object" && "type" in input) {
      return evalOp(input);
    }
    return ops.value(input);
  }

  return evalOp(operator) as EffectOperator;
}

function isValueOperator(op: Operator): op is ValueOperator {
  if (typeof op !== "object" || !("value" in op)) {
    return false;
  }
  return true;
}

function throwValueOpError(): never {
  throw new Error("Condition must ulimately return a value type");
}
