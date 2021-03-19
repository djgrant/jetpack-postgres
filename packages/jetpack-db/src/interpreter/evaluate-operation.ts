import {
  ops,
  Operator,
  Primitive,
  SubtreeStatesAggRow,
  TaskRow,
  Payload,
  EvaluatedEffectOperator,
  EvaluatedExpressionMap,
  EvaluatedPayload,
  ExpressionOperator,
  ExpressionMap,
} from "@djgrant/jetpack";

interface Cache {
  subtree?: Record<string, number>;
}

export function evaluateOperation(
  operation: Operator,
  task: TaskRow
): EvaluatedEffectOperator {
  try {
    return evaluateOperator(operation, task);
  } catch (err) {
    return ops.error(err.toString());
  }
}

function evaluateOperator(
  operator: Operator,
  task: TaskRow
): EvaluatedEffectOperator {
  const cache: Cache = {};
  const evaluatedOperation = evalOp(operator);

  if (typeof evaluatedOperation === "string") {
    return ops.changeState(evaluatedOperation);
  }

  if (isEffectOperator(evaluatedOperation)) {
    return evaluatedOperation;
  }

  return ops.noOp(evaluatedOperation);

  function evalOpAsValue(op: Operator): Primitive {
    const value = evalOp(op);
    if (isPrimitive(value)) return value;
    throw new Error("Operator must ulimately return a value type");
  }

  function evalExpressionMap(
    expressionMap: ExpressionMap
  ): EvaluatedExpressionMap {
    return Object.entries(expressionMap).reduce((acc, [key, value]) => {
      let v;
      if (isPrimitive(value)) {
        v = value;
      } else if (isExpressionOperator(value)) {
        v = evalOpAsValue(value);
      } else {
        v = evalExpressionMap(value);
      }
      return { ...acc, [key]: v };
    }, {});
  }

  function evalPayload(payload: Payload): EvaluatedPayload {
    if (isPrimitive(payload)) {
      return payload;
    }
    if (isExpressionOperator(payload)) {
      return evalOpAsValue(payload);
    }
    return evalExpressionMap(payload);
  }

  function evalOp(op: Operator): Operator {
    if (isPrimitive(op)) {
      return op;
    }

    // Logical
    if (op.type === "condition") {
      const when = evalOpAsValue(op.when);
      const passed = Boolean(when);
      if (!passed) {
        return typeof op.else !== "undefined" ? evalOp(op.else) : ops.noOp();
      }
      return evalOp(op.then);
    }

    // Comparison
    if ("left" in op && "right" in op) {
      const left = evalOpAsValue(op.left);
      const right = evalOpAsValue(op.right);

      if (op.type === "eq") {
        return left === right;
      }

      if (op.type === "not_eq") {
        return left !== right;
      }

      // Numeric
      if (typeof left !== "number" || typeof right !== "number") {
        return false;
      }
      if (op.type === "lte") {
        return left <= right;
      }
      if (op.type === "lt") {
        return left < right;
      }
      if (op.type === "gte") {
        return left >= right;
      }
      if (op.type === "gt") {
        return left > right;
      }
    }

    // Logical
    if (op.type === "any") {
      const values = op.values.map(evalOpAsValue);
      return values.some(valueOperator => Boolean(valueOperator));
    }

    if (op.type === "all") {
      const values = op.values.map(evalOpAsValue);
      return values.every(valueOperator => Boolean(valueOperator));
    }

    if (op.type === "not") {
      const valueOperator = evalOpAsValue(op.value);
      return !Boolean(valueOperator);
    }

    // Arithmetic
    if (op.type === "sum") {
      const nums = op.values.map(evalOpAsValue);

      let total = 0;
      for (const num of nums) {
        if (typeof num !== "number") {
          throw new Error("Value operator must contain a number");
        }
        total += num;
      }

      return total;
    }

    // Getters
    if (op.type === "params") {
      return op.path ? task.params[op.path] : task.params;
    }

    if (op.type === "context") {
      return op.path ? task.context[op.path] : task.context;
    }

    if (op.type === "attempts") {
      return task.attempts;
    }

    if (op.type === "depth") {
      return task.path.split(".").length;
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
      return cache.subtree?.[op.state] || 0;
    }

    // Actions
    if ("action" in op) {
      const action = evalOpAsValue(op.action)?.toString();
      const payload = op.payload && evalPayload(op.payload);

      if (!action) return null;
      return { ...op, action, payload };
    }

    // Create task
    if ("context" in op || "params" in op) {
      const params = op.params && evalExpressionMap(op.params);
      const context = op.context && evalExpressionMap(op.context);
      return { ...op, params, context };
    }

    return op;
  }
}

function isPrimitive(value: any): value is Primitive {
  return typeof value !== "object" || value === null;
}

function isEffectOperator(op: any): op is EvaluatedEffectOperator {
  if (typeof op !== "object" || op === null) return false;
  return effectTypes.includes(op.type as EffectType);
}

function isExpressionOperator(op: any): op is ExpressionOperator {
  if (typeof op !== "object" || op === null) return false;
  return expressionTypes.includes(op.type as ExpressionType);
}

type EffectType = EvaluatedEffectOperator["type"];
type ExpressionType = Exclude<ExpressionOperator, Primitive>["type"];

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

const expressionTypes: ExpressionType[] = [
  "all",
  "any",
  "attempts",
  "condition",
  "context",
  "context",
  "depth",
  "eq",
  "gt",
  "gte",
  "lt",
  "lte",
  "not",
  "not_eq",
  "params",
  "subtree_state_count",
  "sum",
];
