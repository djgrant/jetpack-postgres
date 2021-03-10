export type Primitive = string | number | boolean | null;

export type Operator = EffectOperator | ExpressionOperator;

export type ExpressionOperator =
  | Primitive
  | ComparisonOperator
  | ConditionOperator
  | GetterOperator
  | ArithmeticOperator
  | LogicalOperator
  | ValueOperator;

export type EffectOperator =
  | string
  | ChangeStateOperator
  | CreateRootTaskOperator
  | CreateSubTaskOperator
  | DispatchActionToParentOperator
  | DispatchActionToRootOperator
  | DispatchActionToSiblingsOperator
  | ErrorOperator
  | IncrementAttemptsOperator
  | NoOpOperator;

export type ComparisonOperator =
  | LteOperator
  | LtOperator
  | GteOperator
  | GtOperator
  | EqOperator
  | NotEqOperator;

export type LogicalOperator = AnyOperator | AllOperator;

export type ArithmeticOperator = SumOperator;

export type GetterOperator =
  | ParamsOperator
  | ContextOperator
  | AttemptsOperator
  | SubtreeStateCountOperator;

export interface ValueOperator {
  type: "value";
  value: Primitive;
}

// Condition
export interface ConditionOperator {
  type: "condition";
  when: ExpressionOperator;
  then: Operator;
  else?: Operator;
}

// Logical
interface LogicalBase {
  values: ExpressionOperator[];
}

export interface AnyOperator extends LogicalBase {
  type: "any";
}

export interface AllOperator extends LogicalBase {
  type: "all";
}

// Comparison
interface ComparisonBase {
  left: ExpressionOperator;
  right: ExpressionOperator;
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

// Arithmetic
export interface SumOperator {
  type: "sum";
  values: (number | ExpressionOperator)[];
}

// Getter
export interface ParamsOperator {
  type: "params";
  path?: string;
}

export interface ContextOperator {
  type: "context";
  path?: string;
}

export interface AttemptsOperator {
  type: "attempts";
}

export interface SubtreeStateCountOperator {
  type: "subtree_state_count";
  state: string;
}

// Effects
export interface NoOpOperator {
  type: "no_op";
  operation?: Operator;
}

export interface ErrorOperator {
  type: "error";
  message: string;
}

export interface ChangeStateOperator {
  type: "change_state";
  new_state: string;
}

export interface IncrementAttemptsOperator {
  type: "increment_attempts";
}

export interface CreateSubTaskOperator<Params = {}, Context = {}> {
  type: "create_sub_task";
  machine_id: string;
  parent_id: string;
  params?: Params;
  context?: Context;
}

export interface CreateRootTaskOperator<Params = {}, Context = {}> {
  type: "create_root_task";
  machine_id: string;
  params?: Params;
  context?: Context;
}

export interface DispatchActionToRootOperator {
  type: "dispatch_action_to_root";
  action: string;
  payload?: any;
}

export interface DispatchActionToParentOperator {
  type: "dispatch_action_to_parent";
  action: string;
  payload?: any;
}

export interface DispatchActionToSiblingsOperator {
  type: "dispatch_action_to_siblings";
  action: string;
  payload?: any;
}
