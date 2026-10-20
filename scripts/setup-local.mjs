import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// This command owns a separate loopback-only cluster. It never reads a remote
// database URL or runs migrations against a database supplied by the caller.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const local = join(root, ".local");
const data = join(local, "postgres");
const stateFile = join(local, "database.json");
const envFile = join(root, ".env.local");
const port = "55432";
const database = "trustcore_book_local";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} failed. ${result.error?.code === "ENOENT" ? "Install PostgreSQL 16+ and ensure its binaries are on PATH." : "Check .local/postgres.log and that port 55432 is available."}`,
    );
  return result.stdout;
}

try {
  // Refuse to replace an existing configuration with a different target.
  const managed =
    existsSync(envFile) &&
    readFileSync(envFile, "utf8").startsWith("# Managed by pnpm setup:local\n");
  if (
    (existsSync(envFile) && !managed) ||
    existsSync(join(root, ".env")) ||
    existsSync(join(root, ".env.development.local"))
  )
    throw new Error(
      "Existing environment configuration found. Keep it and configure its development database, or move it aside before using setup:local.",
    );
  if (
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXTAUTH_SECRET
  )
    throw new Error(
      "Unset exported DATABASE_URL, DIRECT_URL, NEXTAUTH_URL and NEXTAUTH_SECRET before using setup:local; they override local configuration.",
    );
  run("initdb", ["--version"]);
  mkdirSync(local, { recursive: true, mode: 0o700 });
  if (existsSync(data) && !existsSync(stateFile))
    throw new Error("An unmanaged local cluster exists. No changes made.");
  const state = existsSync(stateFile)
    ? JSON.parse(readFileSync(stateFile, "utf8"))
    : {
        password: randomBytes(32).toString("hex"),
        secret: randomBytes(32).toString("hex"),
      };
  if (!existsSync(stateFile))
    writeFileSync(stateFile, JSON.stringify(state), {
      mode: 0o600,
      flag: "wx",
    });
  const passwordFile = join(local, "postgres-password");
  writeFileSync(passwordFile, state.password, { mode: 0o600 });
  if (!existsSync(join(data, "PG_VERSION"))) {
    run("initdb", [
      "-D",
      data,
      "-U",
      "trustcore_local",
      "--pwfile",
      passwordFile,
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
    ]);
    writeFileSync(
      join(data, "postgresql.conf"),
      `\nlisten_addresses = '127.0.0.1'\nport = ${port}\nunix_socket_directories = ''\n`,
      { flag: "a" },
    );
  }
  const running = spawnSync("pg_ctl", ["-D", data, "status"], {
    encoding: "utf8",
  });
  if (running.status !== 0)
    run("pg_ctl", [
      "-D",
      data,
      "-l",
      join(local, "postgres.log"),
      "-w",
      "start",
    ]);
  const pgEnv = {
    ...process.env,
    PGHOST: "127.0.0.1",
    PGPORT: port,
    PGUSER: "trustcore_local",
    PGPASSWORD: state.password,
    PGDATABASE: "postgres",
    PGSSLMODE: "disable",
    PGCONNECT_TIMEOUT: "5",
    PGOPTIONS: "",
    PGSERVICEFILE: "/dev/null",
  };
  delete pgEnv.PGSERVICE;
  // Verify this is our cluster before creating a database or migrating it.
  const actualData = run("psql", ["-X", "-w", "-Atc", "SHOW data_directory"], {
    env: pgEnv,
  }).trim();
  if (actualData !== data)
    throw new Error(
      "Local database identity check failed. No migrations applied.",
    );
  const found = run(
    "psql",
    [
      "-X",
      "-w",
      "-Atc",
      `SELECT 1 FROM pg_database WHERE datname = '${database}'`,
    ],
    { env: pgEnv },
  ).trim();
  if (found !== "1") run("createdb", [database], { env: pgEnv });
  const url = `postgresql://trustcore_local:${state.password}@127.0.0.1:${port}/${database}`;
  run("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DIRECT_URL: url },
    stdio: ["ignore", "pipe", "pipe"],
  });
  run("pnpm", ["db:generate"]);
  writeFileSync(
    envFile,
    `# Managed by pnpm setup:local\nDATABASE_URL="${url}"\nDIRECT_URL="${url}"\nNEXTAUTH_URL="http://localhost:3000"\nNEXTAUTH_SECRET="${state.secret}"\nA2_MEMBERSHIP_ENABLED=false\nBOOKING_MVP_ENABLED=false\n`,
    { mode: 0o600 },
  );
  console.log(
    "Local database is ready. Restart pnpm dev, then open http://localhost:3000/register.\nRun pnpm setup:local again after restarting your Mac to start the database.\nTo stop the database: pg_ctl -D .local/postgres stop",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
