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
      id: "45b65ee3-26e3-5d70-b779-bcf943389854",
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
      id: "45b65ee3-26e3-5d70-b779-bcf943389854",
      name: "Test Task",
    });
    expect(machinesTable.rows[1]).toMatchObject({
      id: "6ec6a853-b0ff-5cac-ab6c-fc5dcbec67ae",
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
      id: "45b65ee3-26e3-5d70-b779-bcf943389854",
      name: "Test Task",
    });
    expect(machinesTable.rows[1]).toMatchObject({
      id: "6ec6a853-b0ff-5cac-ab6c-fc5dcbec67ae",
      name: "Test Task",
    });
  });
});
