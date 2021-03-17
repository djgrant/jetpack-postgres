import { Pool } from "pg";
import { connectionString } from "../setup/arrange";
import {
  Machine,
  Jetpack,
  createBaseMachine,
  MachineOptions,
  ActionRow,
  TaskRow,
} from "@djgrant/jetpack";

export function makeMachineTester(pool: Pool) {
  return async function testMachine({
    machineDef,
    expectedActions,
    expectedTask,
  }: {
    machineDef: MachineOptions;
    expectedActions?: Partial<ActionRow>[];
    expectedTask: Partial<TaskRow>;
  }) {
    const testMachine = createBaseMachine(machineDef);

    testMachine.onRunning(async () => {});

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine],
      logger: () => {},
    });

    await jetpack.createTask({ machine: testMachine });
    await jetpack.runWorkerOnce();
    await jetpack.end();

    if (expectedActions) {
      const { rows: actions } = await pool.query(
        "select * from jetpack.actions where task_id = 1 order by id"
      );

      expect(actions).toMatchObject(expectedActions);
    }

    const { rows: tasks } = await pool.query(
      "select * from jetpack.tasks where id = 1"
    );

    expect(tasks[0]).toMatchObject(expectedTask);
  };
}

export function makeWorkerRunner(pool: Pool) {
  return async function runTestWorker(
    machines: Machine[],
    callback: (jetpack: Jetpack) => Promise<any>
  ) {
    const jetpack = new Jetpack({
      db: connectionString,
      machines: machines,
      logger: () => {},
    });

    await callback(jetpack);

    await jetpack.runWorkerOnce();
    await jetpack.end();

    const { rows: actions } = await pool.query<ActionRow>(
      "select * from jetpack.actions where task_id = 1 order by id"
    );

    const { rows: tasks } = await pool.query<TaskRow>(
      "select * from jetpack.tasks order by id"
    );

    return { tasks, actions };
  };
}
