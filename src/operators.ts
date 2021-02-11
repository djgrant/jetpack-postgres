import {
  AttemptsOperator,
  ChangeStateOperator,
  Comparable,
  ConditionOperator,
  CreateSubTaskOperator,
  ErrorOperator,
  IncrementAttemptsOperator,
  LteOperator,
  LtOperator,
  NoOpOperator,
  Primitive,
  ValueOperator,
} from "./interfaces/operators";

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

export const createSubTask = (opts: {
  machine: { id: string };
}): CreateSubTaskOperator => ({
  type: "create_sub_task",
  machine_id: opts.machine.id,
  parent_id: "$self",
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
