import { createBaseMachine, ops } from "@djgrant/jetpack";
import { fetchDataMachine } from "./fetch-data";
import { etlFailureMachine, etlSuccessMachine } from "./on-complete";

export const etlMachine = createBaseMachine({
  name: "ETL",
  initial: "done",
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({ machine: fetchDataMachine }),
        SUBTREE_UPDATE: ops.condition({
          when: ops.all([
            ops.subtree.all("done", "abandoned"),
            ops.subtree.some("abandoned"),
          ]),
          then: ops.createRootTask({
            machine: etlFailureMachine,
          }),
        }),
      },
    },
  },
});
