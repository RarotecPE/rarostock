import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

function buildDatabaseUrl() {
  const databaseConnection = process.env.DATABASE_CONNECTION;
  if (!databaseConnection) return process.env.DATABASE_URL;

  const [hostPort, databaseName, user, password] = databaseConnection.split(";");
  const [host, port] = (hostPort ?? "").split(":");
  const database = databaseName?.replace(/~$/, "");

  if (!host || !port || !database || !user || !password) {
    throw new Error("DATABASE_CONNECTION deve estar no formato host:port;banco;usuario;senha");
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

const databaseUrl = buildDatabaseUrl();

if (!databaseUrl) {
  throw new Error("DATABASE_CONNECTION or DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
