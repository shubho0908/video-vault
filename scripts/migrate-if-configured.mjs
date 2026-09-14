import { spawnSync } from "node:child_process";

if (
  !process.env.NEON_DATABASE_URL_UNPOOLED &&
  !process.env.DATABASE_URL_UNPOOLED
) {
  console.log(
    "Skipping database migrations: no unpooled database URL is configured."
  );
  process.exit(0);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["drizzle-kit", "migrate"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
