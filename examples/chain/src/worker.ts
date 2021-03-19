import { Jetpack } from "@djgrant/jetpack";
import * as machines from "./machines";

const jetpack = new Jetpack({
  db: "postgres://danielgrant@localhost:5432/jetpack",
  machines,
});

jetpack
  .createTask({ machine: machines.chainedWorkflowMachine })
  .catch(console.log);

jetpack.runWorker();
