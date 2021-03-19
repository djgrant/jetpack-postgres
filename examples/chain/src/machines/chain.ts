import { createBaseMachine, ops } from "@djgrant/jetpack";
import { processNextTaskMachine } from "./process-next-task";
import { workflowFailureMachine, workflowSuccessMachine } from "./on-complete";

export const chainedWorkflowMachine = createBaseMachine({
  name: "Chained workflow",
  initial: "done",
  states: {
    done: {
      ENTER: ops.createSubTask({
        machine: processNextTaskMachine,
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
