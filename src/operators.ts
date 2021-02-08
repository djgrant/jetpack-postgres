import {
  AttemptsOperator,
  ChangeStateOperator,
  Comparable,
  ConditionOperator,
  CreateTaskOperator,
  ErrorOperator,
  IncrementAttemptsOperator,
  LteOperator,
  LtOperator,
  NoOpOperator,
  Primitive,
  ValueOperator,
} from "./interfaces";

export const noOp = (): NoOpOperator => ({
  type: "no_op",
});

export const error = (message: string): ErrorOperator => ({
  type: "error",
  message,
});

export const value = (value: Primitive): ValueOperator => ({
  type: "value",
  value,
});

export const changeState = (newState: string): ChangeStateOperator => ({
  type: "change_state",
  new_state: newState,
});

export const createTask = (opts: {
  machine: { id: string };
}): CreateTaskOperator => ({
  type: "create_task",
  machine_id: opts.machine.id,
});

export const self = () => ({
  id: "$self",
});

export const attempts = (): AttemptsOperator => ({
  type: "attempts",
});

export const condition = (
  opts: Omit<ConditionOperator, "type">
): ConditionOperator => ({
  type: "condition",
  ...opts,
});

export const incrementAttempts = (): IncrementAttemptsOperator => ({
  type: "increment_attempts",
});

export const lte = (left: Comparable, right: Comparable): LteOperator => ({
  type: "lte",
  left,
  right,
});

export const lt = (left: Comparable, right: Comparable): LtOperator => ({
  type: "lt",
  left,
  right,
});
