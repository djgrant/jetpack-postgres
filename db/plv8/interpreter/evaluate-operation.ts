import {
  ops,
  EvaluableOperator,
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
  const cache: Cache = {};

  function evalOp(op: Operator): Operator {
    // Syntactic sugar
    if (typeof op === "string") {
      return ops.changeState(op);
    }

    // Logical
    if (op.type === "condition") {
      const when = evalToValueOperator(op.when);
      const isPass = Boolean(when.value);
      return isPass ? evalOp(op.then) : op.else ? evalOp(op.else) : ops.noOp();
    }

    // Comparison
    if ("left" in op && "right" in op) {
      const left = evalToValueOperator(op.left);
      const right = evalToValueOperator(op.right);

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
      const valueOperators = op.values.map(evalToValueOperator);
      return ops.value(
        valueOperators.some(valueOperator => Boolean(valueOperator.value))
      );
    }

    if (op.type === "all") {
      const valueOperators = op.values.map(evalToValueOperator);
      return ops.value(
        valueOperators.every(valueOperator => Boolean(valueOperator.value))
      );
    }

    // Arithmetic
    if (op.type === "sum") {
      const numberOperators = op.values.map(evalToValueOperator);

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

  function evalToValueOperator(input: EvaluableOperator): ValueOperator {
    if (input !== null && typeof input === "object" && "type" in input) {
      const value = evalOp(input);
      if (!isValueOperator(value)) {
        throw new Error("Operator must ulimately return a value type");
      }
      return value;
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
