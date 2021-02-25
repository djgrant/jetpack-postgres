import { Execution } from "../internal/execution";

export type Task = (execution: TaskExecution) => Promise<any>;

export interface TaskExecution extends Execution {}
