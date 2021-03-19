import { createBaseMachine, ops } from "@djgrant/jetpack";
import { processNextTaskMachine } from "./process-next-task";
import { workflowFailureMachine, workflowSuccessMachine } from "./on-complete";

const subtreeEndWithSuccess = ops.subtree.all("done");

const subtreeEndWithFailure = ops.all(
  ops.subtree.all("done", "abandoned"),
  ops.subtree.some("abandoned")
);

export const chainedWorkflowMachine = createBaseMachine({
  name: "Chained workflow",
  initial: "done",
  states: {
    done: {
      ENTER: ops.createSubTask({
        machine: processNextTaskMachine,
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
});
