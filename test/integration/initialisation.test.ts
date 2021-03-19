import { Jetpack, createTaskMachine } from "@djgrant/jetpack";
import { migrate, connectionString } from "../setup/arrange";
import { Pool } from "pg";

const pool = new Pool({ connectionString });

describe("initialisation", () => {
  beforeAll(() => migrate());
  afterAll(() => pool.end());

  it("uploads machines", async () => {
    const testMachine = createTaskMachine({
      name: "Test Task",
      maxAttempts: 1,
    });

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine],
      logger: () => {},
    });

    await jetpack.end();

    const machinesTable = await pool.query("select * from jetpack.machines");

    expect(machinesTable.rowCount).toEqual(1);
    expect(machinesTable.rows[0]).toMatchObject({
      id: "2ffc0a6a-0aac-53d3-896f-b0ce3d788dd5",
      name: "Test Task",
    });
  });

  it("creates a new machine when its spec changes", async () => {
    const testMachine = createTaskMachine({
      name: "Test Task",
      maxAttempts: 2,
    });

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine],
      logger: () => {},
    });

    await jetpack.end();

    const machinesTable = await pool.query("select * from jetpack.machines");

    expect(machinesTable.rowCount).toEqual(2);
    expect(machinesTable.rows[0]).toMatchObject({
      id: "2ffc0a6a-0aac-53d3-896f-b0ce3d788dd5",
      name: "Test Task",
    });
    expect(machinesTable.rows[1]).toMatchObject({
      id: "b4109c46-4c37-597c-8b41-9d01ffdd84b5",
      name: "Test Task",
    });
  });

  it("skips creating a machine if there is already a machine with an identical spec", async () => {
    const testMachine = createTaskMachine({
      name: "Test Task",
      maxAttempts: 2,
    });

    const jetpack = new Jetpack({
      db: connectionString,
      machines: [testMachine],
      logger: () => {},
    });

    await jetpack.end();

    const machinesTable = await pool.query("select * from jetpack.machines");

    expect(machinesTable.rowCount).toEqual(2);
    expect(machinesTable.rows[0]).toMatchObject({
      id: "2ffc0a6a-0aac-53d3-896f-b0ce3d788dd5",
      name: "Test Task",
    });
    expect(machinesTable.rows[1]).toMatchObject({
      id: "b4109c46-4c37-597c-8b41-9d01ffdd84b5",
      name: "Test Task",
    });
  });
});
