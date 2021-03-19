export type Operator = EffectOperator | ExpressionOperator;

export type EvaluatedEffectOperator =
  | EvaluatedCreateTaskOperator
  | EvaluatedDispatchOperator
  | ChangeStateOperator
  | ErrorOperator
  | IncrementAttemptsOperator
  | NoOpOperator;

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

export type ExpressionOperator =
  | Primitive
  | ComparisonOperator
  | ConditionOperator
  | GetterOperator
  | ArithmeticOperator
  | LogicalOperator;

export type ComparisonOperator =
  | LteOperator
  | LtOperator
  | GteOperator
  | GtOperator
  | EqOperator
  | NotEqOperator;

export type LogicalOperator = AnyOperator | AllOperator | NotOperator;

export type ArithmeticOperator = SumOperator;

export type GetterOperator =
  | ParamsOperator
  | ContextOperator
  | AttemptsOperator
  | DepthOperator
  | SubtreeStateCountOperator;

// Value
export type Primitive = string | number | boolean | null;

export type ExpressionMap = {
  [key: string]: ExpressionOperator | ExpressionMap | Primitive;
};

export type Payload = ExpressionOperator | ExpressionMap | Primitive;

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

export interface DepthOperator {
  type: "depth";
}

export interface SubtreeStateCountOperator {
  type: "subtree_state_count";
  state: string;
}

// Condition
export interface ConditionOperator {
  type: "condition";
  when: ExpressionOperator;
  then: Operator;
  else?: Operator;
}

// Logical
export interface AnyOperator {
  type: "any";
  values: ExpressionOperator[];
}

export interface AllOperator {
  type: "all";
  values: ExpressionOperator[];
}

export interface NotOperator {
  type: "not";
  value: ExpressionOperator;
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

// Effect
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

export interface CreateSubTaskOperator {
  type: "create_sub_task";
  machine_id: string;
  params?: ExpressionMap;
  context?: ExpressionMap;
}

export interface CreateRootTaskOperator {
  type: "create_root_task";
  machine_id: string;
  params?: ExpressionMap;
  context?: ExpressionMap;
}

export interface DispatchActionToRootOperator {
  type: "dispatch_action_to_root";
  action: string;
  payload?: Payload;
}

export interface DispatchActionToParentOperator {
  type: "dispatch_action_to_parent";
  action: string;
  payload?: Payload;
}

export interface DispatchActionToSiblingsOperator {
  type: "dispatch_action_to_siblings";
  action: string;
  payload?: Payload;
}

// Evaluated
export type EvaluatedExpressionMap = {
  [key: string]: Primitive | EvaluatedExpressionMap;
};

export type EvaluatedPayload = Primitive | EvaluatedExpressionMap;

export interface EvaluatedDispatchOperator {
  type:
    | "dispatch_action_to_root"
    | "dispatch_action_to_parent"
    | "dispatch_action_to_siblings";
  action: string;
  payload?: EvaluatedPayload;
}

export interface EvaluatedCreateTaskOperator {
  type: "create_sub_task" | "create_root_task";
  machine_id: string;
  params?: EvaluatedExpressionMap;
  context?: EvaluatedExpressionMap;
}
