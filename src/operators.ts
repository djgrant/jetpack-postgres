import {
  AllOperator,
  AnyOperator,
  AttemptsOperator,
  ChangeStateOperator,
  ConditionOperator,
  ContextOperator,
  CreateRootTaskOperator,
  CreateSubTaskOperator,
  DispatchActionToParentOperator,
  DispatchActionToRootOperator,
  DispatchActionToSiblingsOperator,
  EqOperator,
  ErrorOperator,
  ExpressionOperator,
  GteOperator,
  GtOperator,
  IncrementAttemptsOperator,
  LteOperator,
  LtOperator,
  NoOpOperator,
  NotEqOperator,
  Operator,
  ParamsOperator,
  Primitive,
  SubtreeStateCountOperator,
  SumOperator,
  ValueOperator,
} from "./interfaces/operators";

// Getters
export const value = (value: Primitive): ValueOperator => ({
  type: "value",
  value,
});

export const self = () => ({
  id: "$self",
});

export const attempts = (): AttemptsOperator => ({
  type: "attempts",
});

export const params = (path?: string): ParamsOperator => ({
  type: "params",
  path,
});

export const context = (path?: string): ContextOperator => ({
  type: "context",
  path,
});

// Conditional
export const condition = (
  opts: Omit<ConditionOperator, "type">
): ConditionOperator => ({
  type: "condition",
  ...opts,
});

// Logical
export const any = (...values: ExpressionOperator[]): AnyOperator => ({
  type: "any",
  values,
});

export const all = (...values: ExpressionOperator[]): AllOperator => ({
  type: "all",
  values,
});

export const sum = (...values: ExpressionOperator[]): SumOperator => ({
  type: "sum",
  values,
});

// Comparison
export const lte = (
  left: ExpressionOperator,
  right: ExpressionOperator
): LteOperator => ({
  type: "lte",
  left,
  right,
});

export const gte = (
  left: ExpressionOperator,
  right: ExpressionOperator
): GteOperator => ({
  type: "gte",
  left,
  right,
});

export const lt = (
  left: ExpressionOperator,
  right: ExpressionOperator
): LtOperator => ({
  type: "lt",
  left,
  right,
});

export const gt = (
  left: ExpressionOperator,
  right: ExpressionOperator
): GtOperator => ({
  type: "gt",
  left,
  right,
});

export const eq = (
  left: ExpressionOperator,
  right: ExpressionOperator
): EqOperator => ({
  type: "eq",
  left,
  right,
});

export const notEq = (
  left: ExpressionOperator,
  right: ExpressionOperator
): NotEqOperator => ({
  type: "not_eq",
  left,
  right,
});

// Subtree
export const subtree = {
  count: (state: string): SubtreeStateCountOperator => ({
    type: "subtree_state_count",
    state,
  }),

  all: (...states: string[]) =>
    eq(sum(...states.map(subtree.count)), subtree.count("total")),

  some: (...states: string[]) =>
    any(...states.map(state => gte(subtree.count(state), 1))),
};

// Effects
export const noOp = (operation?: Operator): NoOpOperator => ({
  type: "no_op",
  operation,
});

export const error = (message: string): ErrorOperator => ({
  type: "error",
  message,
});

export const changeState = (newState: string): ChangeStateOperator => ({
  type: "change_state",
  new_state: newState,
});

export const createSubTask = (opts: {
  machine: { id: string };
  params?: {};
  context?: {};
}): CreateSubTaskOperator => ({
  type: "create_sub_task",
  machine_id: opts.machine.id,
  parent_id: "$self",
  params,
  context,
});

export const createRootTask = (opts: {
  machine: { id: string };
  params?: {};
  context?: {};
}): CreateRootTaskOperator => ({
  type: "create_root_task",
  machine_id: opts.machine.id,
  params,
});

export const incrementAttempts = (): IncrementAttemptsOperator => ({
  type: "increment_attempts",
});

export const dispatchActionToRoot = (
  action: string,
  payload?: {}
): DispatchActionToRootOperator => ({
  type: "dispatch_action_to_root",
  action,
  payload,
});

export const dispatchActionToSiblings = (
  action: string,
  payload?: {}
): DispatchActionToSiblingsOperator => ({
  type: "dispatch_action_to_siblings",
  action,
  payload,
});

export const dispatchActionToParent = (
  action: string,
  payload?: {}
): DispatchActionToParentOperator => ({
  type: "dispatch_action_to_parent",
  action,
  payload,
});
