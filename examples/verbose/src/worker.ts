import { Jetpack } from "@djgrant/jetpack";
import { taskMachine } from "./machines";

const jetpack = new Jetpack({
  db: "postgres://danielgrant@localhost:5432/jetpack",
  machines: [taskMachine],
});

jetpack.runWorker();

jetpack.createTask({ machine: taskMachine }).catch(console.log);
