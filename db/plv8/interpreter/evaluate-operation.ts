import {
  ops,
  Comparable,
  Operator,
  ValueOperator,
  EffectOperator,
  TaskRow,
} from "@djgrant/jetpack";

export function evaluateOperation(
  operation: Operator,
  task: TaskRow
): EffectOperator {
  try {
    return evaluateOperator(operation, task);
  } catch (err) {
    return ops.error(err.toString());
  }
}

export function evaluateOperator(
  operator: Operator,
  task: TaskRow
): EffectOperator {
  function evalOp(op: Operator): Operator {
    if (typeof op === "string") {
      return ops.changeState(op);
    }

    if (op.type === "condition") {
      const when = evalOp(op.when);
      if (!isValueOperator(when)) throwValueOpError();
      const isPass = Boolean(when.value);
      return isPass ? evalOp(op.then) : op.else ? evalOp(op.else) : ops.noOp();
    }

    if (op.type === "lt" || op.type === "lte") {
      const left = evalComparable(op.left);
      const right = evalComparable(op.right);
      if (!isValueOperator(left)) throwValueOpError();
      if (!isValueOperator(right)) throwValueOpError();
      if (typeof left.value !== "number" || typeof right.value !== "number") {
        return ops.value(false);
      }
      if (op.type === "lte") {
        return ops.value(left.value <= right.value);
      }
      if (op.type === "lt") {
        return ops.value(left.value < right.value);
      }
    }

    if (op.type === "params") {
      return ops.value(task.params[op.path]);
    }

    if (op.type === "context") {
      return ops.value(task.params[op.path]);
    }

    if (op.type === "attempts") {
      return ops.value(task.attempts);
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
