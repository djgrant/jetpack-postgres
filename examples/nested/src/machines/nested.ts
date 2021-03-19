import { createBaseMachine, ops } from "@djgrant/jetpack";
import { fetchDataMachine } from "./fetch-data";
import { workflowFailureMachine, workflowSuccessMachine } from "./on-complete";

const subtreeEndWithSuccess = ops.subtree.all("done");

const subtreeEndWithFailure = ops.all(
  ops.subtree.all("done", "abandoned"),
  ops.subtree.some("abandoned")
);

export const nestedWorkflowMachine = createBaseMachine({
  name: "Nested workflow",
  initial: "done",
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({
          machine: fetchDataMachine,
        }),
        SUBTREE_UPDATE: [
          ops.condition({
            when: subtreeEndWithFailure,
            then: ops.createRootTask({
              machine: workflowFailureMachine,
            }),
          }),
          ops.condition({
            when: subtreeEndWithSuccess,
            then: ops.createRootTask({
              machine: workflowSuccessMachine,
            }),
          }),
        ],
      },
    },
  },
});
