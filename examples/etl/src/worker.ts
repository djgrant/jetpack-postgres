import { Jetpack } from "@djgrant/jetpack";
import * as machines from "./machines";

const jetpack = new Jetpack({
  db: "postgres://danielgrant@localhost:5432/jetpack",
  machines,
});

jetpack.createTask({ machine: machines.etlMachine }).catch(console.log);

jetpack.runWorker();
