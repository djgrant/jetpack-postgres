export type Operator = Logical | Comparison | Getter | Effect;

export type Logical = Condition;
export type Comparison = Lte | Lt | Gte | Gt | Eq | NotEq;
export type Getter = Params | Context | Iterations;
export type Effect =
  | string
  | CreateTask
  | CreateRootTask
  | DispatchActionToRoot
  | DispatchActionToParent
  | DispatchActionToSiblings;

interface Base {
  type: string;
  [key: string]: {} | void;
}

// Logical
export interface Condition extends Base {
  type: "condition";
  when: Logical | Comparison | Getter;
  then: Logical | Effect;
  else?: Logical | Effect;
}

// Comparison
type Comparable = string | boolean | number | Logical | Comparison | Getter;

interface ComparisonBase extends Base {
  left: Comparable;
  right: Comparable;
}

export interface Lte extends ComparisonBase {
  type: "lte";
}

export interface Lt extends ComparisonBase {
  type: "lt";
}

export interface Gte extends ComparisonBase {
  type: "gte";
}

export interface Gt extends ComparisonBase {
  type: "gt";
}

export interface Eq extends ComparisonBase {
  type: "eq";
}

export interface NotEq extends ComparisonBase {
  type: "not-eq";
}

// Getter
export interface Params extends Base {
  type: "params";
  path: string;
}

export interface Context extends Base {
  type: "context";
  path: string;
}

export interface Iterations extends Base {
  type: "iterations";
}

// Effects
export interface CreateTask extends Base {
  type: "create-task";
  machine: string;
}

export interface CreateRootTask extends Base {
  type: "create-root-task";
  machine: string;
}

export interface DispatchActionToRoot extends Base {
  type: "dispatch-action-to-root";
  action: string;
}

export interface DispatchActionToParent extends Base {
  type: "dispatch-action-to-parent";
  action: string;
}

export interface DispatchActionToSiblings extends Base {
  type: "dispatch-action-to-siblings";
  action: string;
}
