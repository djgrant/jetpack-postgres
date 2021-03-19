import { TaskExecution } from "@djgrant/jetpack";

export async function fetchData(self: TaskExecution) {
  const { params, context, log } = self;
  log("Task machine example running!");
  log({ params, context });
}
