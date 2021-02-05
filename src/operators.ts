import { Primitive, ValueOperator } from "./interfaces";

export const ops = {
  value: (value: Primitive): ValueOperator => ({
    type: "value",
    value,
  }),
};
