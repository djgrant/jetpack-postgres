import { createTaskMachine } from "@djgrant/jetpack";
import { onEtlFailure, onEtlSuccess } from "../tasks/on-complete";

export const etlFailureMachine = createTaskMachine({
  name: "ETL Failure",
  maxAttempts: 3,
  task: onEtlFailure,
});

export const etlSuccessMachine = createTaskMachine({
  name: "ETL Success",
  maxAttempts: 3,
  task: onEtlSuccess,
});
