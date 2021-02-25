import { TaskExecution } from "@djgrant/jetpack";

export async function fetchData(self: TaskExecution) {
  const { id, params, context, setContext, log } = self;
  log("Task machine example running!");
  log({ params, context });
  const coinFlip = Math.random() > 0.5;
  const newContext = await setContext({ [id]: { coinFlip } });
  log({ newContext });
  if (coinFlip) {
    throw new Error("Task machine failed!");
  }
}
