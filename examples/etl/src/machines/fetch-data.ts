import { createTaskMachine, ops } from "@djgrant/jetpack";

export const fetchDataMachine = createTaskMachine({
  name: "Fetch data",
  maxAttempts: 3,
  states: {
    done: {
      onEvent: {
        ENTER: ops.createSubTask({ machine: ops.self() }),
      },
    },
  },
});

fetchDataMachine.onRunning(async self => {
  const { id, params, context, setContext, log } = self;
  log("Task machine example running!");
  log({ params, context });
  const coinFlip = Math.random() > 0.5;
  const newContext = await setContext({ [id]: { coinFlip } });
  log({ newContext });
  if (coinFlip) {
    throw new Error("Task machine failed!");
  }
});
