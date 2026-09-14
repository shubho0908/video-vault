import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (
  !process.env.NEON_DATABASE_URL_UNPOOLED &&
  !process.env.DATABASE_URL_UNPOOLED
) {
  console.log(
    "Skipping database migrations: no unpooled database URL is configured."
  );
  process.exit(0);
}

const drizzleKit = fileURLToPath(
  new URL("../node_modules/drizzle-kit/bin.cjs", import.meta.url)
);
const result = spawnSync(process.execPath, [drizzleKit, "migrate"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
