import {
  AllOperator,
  AnyOperator,
  AttemptsOperator,
  ChangeStateOperator,
  ConditionOperator,
  CreateRootTaskOperator,
  CreateSubTaskOperator,
  EqOperator,
  ErrorOperator,
  EvaluableOperator,
  GteOperator,
  IncrementAttemptsOperator,
  LteOperator,
  LtOperator,
  NoOpOperator,
  Primitive,
  SubtreeStateCountOperator,
  SumOperator,
  ValueOperator,
} from "./interfaces/operators";

type Late<T> = T | (() => T);

function late(val: Late<any>) {
  if (typeof val === "function") {
    return val();
  }
  return val;
}

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
  machine: Late<{ id: string }>;
}): CreateSubTaskOperator => ({
  type: "create_sub_task",
  machine_id: late(opts.machine).id,
  parent_id: "$self",
});

export const createRootTask = (opts: {
  machine: Late<{ id: string }>;
}): CreateRootTaskOperator => ({
  type: "create_root_task",
  machine_id: late(opts.machine).id,
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

export const lte = (
  left: EvaluableOperator,
  right: EvaluableOperator
): LteOperator => ({
  type: "lte",
  left,
  right,
});

export const gte = (
  left: EvaluableOperator,
  right: EvaluableOperator
): GteOperator => ({
  type: "gte",
  left,
  right,
});

export const lt = (
  left: EvaluableOperator,
  right: EvaluableOperator
): LtOperator => ({
  type: "lt",
  left,
  right,
});

export const eq = (
  left: EvaluableOperator,
  right: EvaluableOperator
): EqOperator => ({
  type: "eq",
  left,
  right,
});

export const any = (values: EvaluableOperator[]): AnyOperator => ({
  type: "any",
  values,
});

export const all = (values: EvaluableOperator[]): AllOperator => ({
  type: "all",
  values,
});

export const sum = (values: EvaluableOperator[]): SumOperator => ({
  type: "sum",
  values,
});

export const subtree = {
  count: (state: string): SubtreeStateCountOperator => ({
    type: "subtree_state_count",
    state,
  }),

  all: (...states: string[]) =>
    eq(sum(states.map(subtree.count)), subtree.count("total")),

  some: (...states: string[]) =>
    any(states.map(state => gte(subtree.count(state), 1))),
};
