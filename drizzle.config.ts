import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function buildDatabaseUrl() {
  const databaseConnection = process.env.DATABASE_CONNECTION;
  if (!databaseConnection) {
    return process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;
  }

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
  throw new Error("DATABASE_CONNECTION, DRIZZLE_DATABASE_URL or DATABASE_URL is required");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: databaseUrl,
  },
});
