import {
  ChangeStateOperator,
  CreateTaskOperator,
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
  createTask: (opts: { machine: { id: string } }): CreateTaskOperator => ({
    type: "create_task",
    machine_id: opts.machine.id,
  }),
  self: () => ({
    id: "$self",
  }),
};
