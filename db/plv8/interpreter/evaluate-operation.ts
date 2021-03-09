import {
  ops,
  Primitive,
  Operator,
  ValueOperator,
  EffectOperator,
  TaskRow,
  SubtreeStatesAggRow,
} from "@djgrant/jetpack";

interface Cache {
  subtree?: Record<string, number>;
}

export function evaluateOperation(
  operation: Operator,
  task: TaskRow
): Exclude<EffectOperator, string> {
  try {
    return evaluateOperator(operation, task);
  } catch (err) {
    return ops.error(err.toString());
  }
}

export function evaluateOperator(
  operator: Operator,
  task: TaskRow
): Exclude<EffectOperator, string> {
  const cache: Cache = {};

  function evalOpAsValue(op: Operator): ValueOperator {
    const valueOp = evalOp(op);
    if (isPrimitive(valueOp)) {
      return ops.value(valueOp);
    }
    if (isValueOperator(valueOp)) {
      return valueOp;
    }
    throw new Error("Operator must ulimately return a value type");
  }

  function evalOp(op: Operator): Operator {
    if (isPrimitive(op)) {
      return op;
    }

    // Logical
    if (op.type === "condition") {
      const when = evalOpAsValue(op.when);
      const passed = Boolean(when.value);
      if (!passed) {
        return op.else ? evalOp(op.else) : ops.noOp();
      }
      return evalOp(op.then);
    }

    // Comparison
    if ("left" in op && "right" in op) {
      const left = evalOpAsValue(op.left);
      const right = evalOpAsValue(op.right);

      if (op.type === "eq") {
        return ops.value(left.value === right.value);
      }

      // Numeric
      if (typeof left.value !== "number" || typeof right.value !== "number") {
        return ops.value(false);
      }
      if (op.type === "lte") {
        return ops.value(left.value <= right.value);
      }
      if (op.type === "lt") {
        return ops.value(left.value < right.value);
      }
      if (op.type === "gte") {
        return ops.value(left.value >= right.value);
      }
      if (op.type === "gt") {
        return ops.value(left.value > right.value);
      }
    }

    if (op.type === "any") {
      const valueOperators = op.values.map(evalOpAsValue);
      return ops.value(
        valueOperators.some(valueOperator => Boolean(valueOperator.value))
      );
    }

    if (op.type === "all") {
      const valueOperators = op.values.map(evalOpAsValue);
      return ops.value(
        valueOperators.every(valueOperator => Boolean(valueOperator.value))
      );
    }

    // Arithmetic
    if (op.type === "sum") {
      const numberOperators = op.values.map(evalOpAsValue);

      let total = 0;
      for (const numberOperator of numberOperators) {
        if (typeof numberOperator.value !== "number") {
          throw new Error("Value operator must contain a number");
        }
        total += numberOperator.value;
      }

      return ops.value(total);
    }

    // Getters
    if (op.type === "params") {
      return ops.value(task.params[op.path]);
    }

    if (op.type === "context") {
      return ops.value(task.params[op.path]);
    }

    if (op.type === "attempts") {
      return ops.value(task.attempts);
    }

    if (op.type === "subtree_state_count") {
      if (!cache.subtree) {
        const subtreeQuery = plv8.prepare<SubtreeStatesAggRow>(
          `select * from jetpack.get_subtree_states_agg($1)`,
          ["bigint"]
        );
        const subtreeStates = subtreeQuery.execute([task.id]);
        cache.subtree = {};
        for (const row of subtreeStates) {
          cache.subtree[row.state] = row.descendants;
        }
      }
      return ops.value(cache.subtree?.[op.state] || 0);
    }

    return op;
  }

  const resultingOperator = evalOp(operator);

  if (isEffectOperator(resultingOperator)) {
    if (typeof resultingOperator === "string") {
      return ops.changeState(resultingOperator);
    }
    return resultingOperator;
  }

  return ops.noOp();
}

function isPrimitive(op: Operator): op is Primitive {
  return typeof op !== "object" || op === null;
}

function isValueOperator(op: Operator): op is ValueOperator {
  return typeof op === "object" && op !== null && op.type === "value";
}

function isEffectOperator(op: Operator): op is EffectOperator {
  if (typeof op === "string") return true;
  if (typeof op !== "object" || op === null) return false;
  return effectTypes.includes(op.type as EffectType);
}

type EffectType = Exclude<EffectOperator, string>["type"];

const effectTypes: EffectType[] = [
  "change_state",
  "create_root_task",
  "create_sub_task",
  "dispatch_action_to_parent",
  "dispatch_action_to_root",
  "dispatch_action_to_siblings",
  "error",
  "increment_attempts",
  "no_op",
];
