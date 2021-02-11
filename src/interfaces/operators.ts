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
  | AttemptsOperator;

export type EffectOperator =
  | string
  | NoOpOperator
  | ErrorOperator
  | IncrementAttemptsOperator
  | ChangeStateOperator
  | CreateSubTaskOperator
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
  type: "not_eq";
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

export interface AttemptsOperator extends Base {
  type: "attempts";
}

// Effects

export interface NoOpOperator extends Base {
  type: "no_op";
}

export interface ErrorOperator extends Base {
  type: "error";
  message: string;
}

export interface ChangeStateOperator extends Base {
  type: "change_state";
  new_state: string;
}

export interface IncrementAttemptsOperator extends Base {
  type: "increment_attempts";
}

export interface CreateSubTaskOperator extends Base {
  type: "create_sub_task";
  machine_id: string;
  parent_id: string;
}

export interface CreateRootTaskOperator extends Base {
  type: "create_root_task";
  machine_id: string;
}

export interface DispatchActionToRootOperator extends Base {
  type: "dispatch_action_to_root";
  action: string;
}

export interface DispatchActionToParentOperator extends Base {
  type: "dispatch_action_to_parent";
  action: string;
}

export interface DispatchActionToSiblingsOperator extends Base {
  type: "dispatch_action_to_siblings";
  action: string;
}
