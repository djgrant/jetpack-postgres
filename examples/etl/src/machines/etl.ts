import { createBaseMachine, ops } from "@djgrant/jetpack";
import { fetchDataMachine } from "./fetch-data";
import { etlFailureMachine, etlSuccessMachine } from "./on-complete";

const subtreeEndWithSuccess = ops.subtree.all("done");

const subtreeEndWithFailure = ops.all(
  ops.subtree.all("done", "abandoned"),
  ops.subtree.some("abandoned")
);

export const etlMachine = createBaseMachine({
  name: "ETL",
  initial: "done",
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({ machine: fetchDataMachine }),
        SUBTREE_UPDATE: [
          ops.condition({
            when: subtreeEndWithFailure,
            then: ops.createRootTask({
              machine: etlFailureMachine,
            }),
          }),
          ops.condition({
            when: subtreeEndWithSuccess,
            then: ops.createRootTask({
              machine: etlSuccessMachine,
            }),
          }),
        ],
      },
    },
  },
});
