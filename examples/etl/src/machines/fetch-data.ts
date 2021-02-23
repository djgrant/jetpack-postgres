import { createTaskMachine, ops } from "@djgrant/jetpack";
import { fetchData } from "../tasks/fetch-data";

export const fetchDataMachine = createTaskMachine({
  name: "Fetch data",
  task: fetchData,
  maxAttempts: 3,
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({ machine: ops.self() }),
      },
    },
  },
});
