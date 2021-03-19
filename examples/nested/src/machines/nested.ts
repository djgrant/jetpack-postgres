import { createBaseMachine, ops } from "@djgrant/jetpack";
import { fetchDataMachine } from "./fetch-data";
import { workflowFailureMachine, workflowSuccessMachine } from "./on-complete";

export const nestedWorkflowMachine = createBaseMachine({
  name: "Nested workflow",
  initial: "done",
  states: {
    done: {
      ENTER: ops.createSubTask({
        machine: fetchDataMachine,
      }),
      SUBTREE_FLUSHED: [
        ops.condition({
          when: ops.subtree.some("abandoned"),
          then: ops.createRootTask({
            machine: workflowFailureMachine,
          }),
        }),
        ops.condition({
          when: ops.subtree.all("done"),
          then: ops.createRootTask({
            machine: workflowSuccessMachine,
          }),
        }),
      ],
    },
  },
});
