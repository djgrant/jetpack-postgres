import {
  ChangeStateOperator,
  NoOpOperator,
  Primitive,
  ValueOperator,
} from "./interfaces";

export const ops = {
  noOp: (): NoOpOperator => ({
    type: "no_op",
  }),
  value: (value: Primitive): ValueOperator => ({
    type: "value",
    value,
  }),
  changeState: (newState: string): ChangeStateOperator => ({
    type: "change_state",
    new_state: newState,
  }),
};
