export type Operator =
  | ValueOperator
  | LogicalOperator
  | ComparisonOperator
  | GetterOperator
  | EffectOperator;

export type LogicalOperator = ConditionOperator;

export type ComparisonOperator =
  | LteOperator
  | LtOperator
  | GteOperator
  | GtOperator
  | EqOperator
  | NotEqOperator;

export type GetterOperator =
  | ParamsOperator
  | ContextOperator
  | IterationsOperator;

export type EffectOperator =
  | string
  | NoOpOperator
  | ChangeStatusOperator
  | CreateTaskOperator
  | CreateRootTaskOperator
  | DispatchActionToRootOperator
  | DispatchActionToParentOperator
  | DispatchActionToSiblingsOperator;

interface Base {
  type: string;
}

export type Primitive = string | number | boolean | null;

export interface ValueOperator {
  type: "value";
  value: Primitive;
}

// Logical
export interface ConditionOperator extends Base {
  type: "condition";
  when: ValueOperator | LogicalOperator | ComparisonOperator | GetterOperator;
  then: Operator;
  else?: Operator;
}

// Comparison
export type Comparable =
  | Primitive
  | LogicalOperator
  | ComparisonOperator
  | GetterOperator;

interface ComparisonBase extends Base {
  left: Comparable;
  right: Comparable;
}

export interface LteOperator extends ComparisonBase {
  type: "lte";
}

export interface LtOperator extends ComparisonBase {
  type: "lt";
}

export interface GteOperator extends ComparisonBase {
  type: "gte";
}

export interface GtOperator extends ComparisonBase {
  type: "gt";
}

export interface EqOperator extends ComparisonBase {
  type: "eq";
}

export interface NotEqOperator extends ComparisonBase {
  type: "not-eq";
}

// Getter
export interface ParamsOperator extends Base {
  type: "params";
  path: string;
}

export interface ContextOperator extends Base {
  type: "context";
  path: string;
}

export interface IterationsOperator extends Base {
  type: "iterations";
}

// Effects

export interface NoOpOperator extends Base {
  type: "no-op";
}

export interface ChangeStatusOperator extends Base {
  type: "change-status";
  newStatus: string;
}

export interface CreateTaskOperator extends Base {
  type: "create-task";
  machine: string;
}

export interface CreateRootTaskOperator extends Base {
  type: "create-root-task";
  machine: string;
}

export interface DispatchActionToRootOperator extends Base {
  type: "dispatch-action-to-root";
  action: string;
}

export interface DispatchActionToParentOperator extends Base {
  type: "dispatch-action-to-parent";
  action: string;
}

export interface DispatchActionToSiblingsOperator extends Base {
  type: "dispatch-action-to-siblings";
  action: string;
}
