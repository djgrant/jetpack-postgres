import { NoOpOperator, Primitive, ValueOperator } from "./interfaces";

export const ops = {
  noOp: (): NoOpOperator => ({
    type: "no-op",
  }),
  value: (value: Primitive): ValueOperator => ({
    type: "value",
    value,
  }),
};
