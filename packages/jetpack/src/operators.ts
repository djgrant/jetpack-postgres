import {
  AllOperator,
  AnyOperator,
  AttemptsOperator,
  ChangeStateOperator,
  ConditionOperator,
  ContextOperator,
  CreateRootTaskOperator,
  CreateSubTaskOperator,
  DepthOperator,
  DispatchActionToParentOperator,
  DispatchActionToRootOperator,
  DispatchActionToSiblingsOperator,
  EqOperator,
  ErrorOperator,
  ExpressionMap,
  ExpressionOperator,
  GteOperator,
  GtOperator,
  IncrementAttemptsOperator,
  LteOperator,
  LtOperator,
  NoOpOperator,
  NotEqOperator,
  NotOperator,
  Operator,
  ParamsOperator,
  Payload,
  SubtreeStateCountOperator,
  SumOperator,
} from "./interfaces/operators";

// Getters
export const self = () => ({
  id: "$self",
});

export const attempts = (): AttemptsOperator => ({
  type: "attempts",
});

export const depth = (): DepthOperator => ({
  type: "depth",
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

export const not = (value: ExpressionOperator): NotOperator => ({
  type: "not",
  value,
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
  params?: ExpressionMap;
  context?: ExpressionMap;
}): CreateSubTaskOperator => ({
  type: "create_sub_task",
  machine_id: opts.machine.id,
  params: opts.params,
  context: opts.context,
});

export const createRootTask = (opts: {
  machine: { id: string };
  params?: ExpressionMap;
  context?: ExpressionMap;
}): CreateRootTaskOperator => ({
  type: "create_root_task",
  machine_id: opts.machine.id,
  params: opts.params,
  context: opts.context,
});

export const incrementAttempts = (): IncrementAttemptsOperator => ({
  type: "increment_attempts",
});

export const dispatchActionToRoot = (
  action: string,
  payload?: Payload
): DispatchActionToRootOperator => ({
  type: "dispatch_action_to_root",
  action,
  payload,
});

export const dispatchActionToSiblings = (
  action: string,
  payload?: Payload
): DispatchActionToSiblingsOperator => ({
  type: "dispatch_action_to_siblings",
  action,
  payload,
});

export const dispatchActionToParent = (
  action: string,
  payload?: Payload
): DispatchActionToParentOperator => ({
  type: "dispatch_action_to_parent",
  action,
  payload,
});
