import { TaskExecution } from "@djgrant/jetpack";

export async function fetchData(self: TaskExecution) {
  const { params, context, setContext, log } = self;
  log("Task machine example running!");
  log({ params, context });
  await setContext({ depth: context.depth + 1 });
}
