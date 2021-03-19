import { createTaskMachine } from "@djgrant/jetpack";
import { onWorkflowFailure, onWorkflowSuccess } from "../tasks/on-complete";

export const workflowFailureMachine = createTaskMachine({
  name: "Chain Failure",
  maxAttempts: 3,
  task: onWorkflowFailure,
});

export const workflowSuccessMachine = createTaskMachine({
  name: "Chain Success",
  maxAttempts: 3,
  task: onWorkflowSuccess,
});
