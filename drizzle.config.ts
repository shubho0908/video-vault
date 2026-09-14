import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.NEON_DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error(
    "Set NEON_DATABASE_URL_UNPOOLED or DATABASE_URL_UNPOOLED before running Drizzle migrations."
  );
}

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
