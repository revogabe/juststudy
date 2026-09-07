import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDatabase(connectionString: string) {
  const connection = postgres(connectionString);
  const client = drizzle(connection, {
    casing: "snake_case",
  });

  return {
    client,
    connection: {
      async close() {
        await connection.end();
      },
    },
    transaction: {
      create: client.transaction.bind(client),
    },
  };
}

export type Database = ReturnType<typeof createDatabase>;
export type DatabaseClient = Database["client"];
export type DatabaseTransaction = Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];
