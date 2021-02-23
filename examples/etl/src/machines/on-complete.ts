import { createTaskMachine } from "@djgrant/jetpack";

export const etlFailureMachine = createTaskMachine({
  name: "ETL Failure",
  maxAttempts: 3,
});

export const etlSuccessMachine = createTaskMachine({
  name: "ETL Failure",
  maxAttempts: 3,
});

etlFailureMachine.onRunning(async () => {
  console.log("ETL failed!");
});

etlSuccessMachine.onRunning(async () => {
  console.log("ETL succeeded!");
});
