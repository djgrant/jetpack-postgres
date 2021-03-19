import { TaskExecution } from "@djgrant/jetpack";

const ids = [1, 2, 3, 4, 5];

const getNextId = (lastId: number | null) =>
  lastId ? ids.find(id => id > lastId) : ids[0];

export async function processNextTask(self: TaskExecution) {
  const { context, setContext, log } = self;
  const currentId = getNextId(context.lastId);
  log({ currentId, lastId: context.lastId });
  if (currentId) {
    await setContext({ currentId });
  }
}
