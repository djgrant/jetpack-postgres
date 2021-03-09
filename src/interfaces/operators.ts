export type Primitive = string | number | boolean | null;

export type Operator = EffectOperator | ExpressionOperator;

export type ExpressionOperator =
  | Primitive
  | BinaryOperator
  | ConditionOperator
  | GetterOperator
  | SumOperator
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

export type BinaryOperator =
  | LteOperator
  | LtOperator
  | GteOperator
  | GtOperator
  | EqOperator
  | NotEqOperator
  | AnyOperator
  | AllOperator;

export type GetterOperator =
  | ParamsOperator
  | ContextOperator
  | AttemptsOperator
  | SubtreeStateCountOperator;

export interface ValueOperator {
  type: "value";
  value: Primitive;
}

// Logical
export interface ConditionOperator {
  type: "condition";
  when: ExpressionOperator;
  then: Operator;
  else?: Operator;
}

// Binary
interface BinaryBaseOperator {
  left: ExpressionOperator;
  right: ExpressionOperator;
}

export interface LteOperator extends BinaryBaseOperator {
  type: "lte";
}

export interface LtOperator extends BinaryBaseOperator {
  type: "lt";
}

export interface GteOperator extends BinaryBaseOperator {
  type: "gte";
}

export interface GtOperator extends BinaryBaseOperator {
  type: "gt";
}

export interface EqOperator extends BinaryBaseOperator {
  type: "eq";
}

export interface NotEqOperator extends BinaryBaseOperator {
  type: "not_eq";
}

export interface AnyOperator {
  type: "any";
  values: ExpressionOperator[];
}

export interface AllOperator {
  type: "all";
  values: ExpressionOperator[];
}

// Arithmetic
export interface SumOperator {
  type: "sum";
  values: (number | ExpressionOperator)[];
}

// Getter
export interface ParamsOperator {
  type: "params";
  path: string;
}

export interface ContextOperator {
  type: "context";
  path: string;
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

export interface CreateSubTaskOperator<Params = {}> {
  type: "create_sub_task";
  machine_id: string;
  parent_id: string;
  params?: Params;
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
}

export interface DispatchActionToParentOperator {
  type: "dispatch_action_to_parent";
  action: string;
}

export interface DispatchActionToSiblingsOperator {
  type: "dispatch_action_to_siblings";
  action: string;
}
