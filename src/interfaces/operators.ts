export type Operator =
  | ValueOperator
  | LogicalOperator
  | ComparisonOperator
  | ArithmeticOperators
  | GetterOperator
  | EffectOperator;

export type LogicalOperator = ConditionOperator;

export type ComparisonOperator =
  | LteOperator
  | LtOperator
  | GteOperator
  | GtOperator
  | EqOperator
  | NotEqOperator
  | AnyOperator
  | AllOperator;

export type ArithmeticOperators = SumOperator;

export type GetterOperator =
  | ParamsOperator
  | ContextOperator
  | AttemptsOperator
  | SubtreeStateCountOperator;

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

export type Primitive = string | number | boolean | null;

export type EvaluableOperator =
  | Primitive
  | LogicalOperator
  | ComparisonOperator
  | GetterOperator
  | ValueOperator
  | ArithmeticOperators;

export interface ValueOperator {
  type: "value";
  value: Primitive;
}

interface Base {
  type: string;
}

// Logical
export interface ConditionOperator extends Base {
  type: "condition";
  when: EvaluableOperator;
  then: Operator;
  else?: Operator;
}

// Comparison
interface ComparisonBase extends Base {
  left: EvaluableOperator;
  right: EvaluableOperator;
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

export interface AnyOperator extends Base {
  type: "any";
  values: EvaluableOperator[];
}

export interface AllOperator extends Base {
  type: "all";
  values: EvaluableOperator[];
}

// Arithmetic
export interface SumOperator extends Base {
  type: "sum";
  values: (number | EvaluableOperator)[];
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

export interface SubtreeStateCountOperator extends Base {
  type: "subtree_state_count";
  state: string;
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
