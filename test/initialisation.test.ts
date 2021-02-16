import { migrate, connectionString } from "./setup/arrange";
import { Jetpack, createTaskMachine } from "../src";
import { Pool } from "pg";

const pool = new Pool({ connectionString });

describe.skip("initialisation", () => {
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
      id: "f1700def-3456-5873-a72f-426933398bf0",
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
      id: "f1700def-3456-5873-a72f-426933398bf0",
      name: "Test Task",
    });
    expect(machinesTable.rows[1]).toMatchObject({
      id: "02f3f6ba-4369-5111-9d73-692e150cb7ce",
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
      id: "f1700def-3456-5873-a72f-426933398bf0",
      name: "Test Task",
    });
    expect(machinesTable.rows[1]).toMatchObject({
      id: "02f3f6ba-4369-5111-9d73-692e150cb7ce",
      name: "Test Task",
    });
  });
});
