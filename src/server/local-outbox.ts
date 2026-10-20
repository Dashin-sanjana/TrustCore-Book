import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readdir, realpath, stat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type {
  AccountEmailMessage,
  LocalOutboxEntry,
} from "@/shared/contracts/local-outbox";
import type { LocalOutboxTarget } from "./local-outbox-target";

export type { LocalOutboxEntry } from "@/shared/contracts/local-outbox";

const TTL_MINUTES = {
  VERIFY_EMAIL: 60,
  RESET_PASSWORD: 30,
  INVITATION: 7 * 24 * 60,
} as const;
const FILE = /^[0-9a-f-]{36}\.json$/;

function outboxDirectory() {
  const root =
    process.env.LOCAL_OUTBOX_DIR ??
    path.join(homedir(), ".trustcore-book", "outbox");
  if (
    !path.isAbsolute(root) ||
    root === process.cwd() ||
    root.startsWith(`${process.cwd()}${path.sep}`)
  )
    throw new Error("Local outbox unavailable");
  return root;
}

async function secureDirectory() {
  const directory = outboxDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const [real, info] = await Promise.all([
    realpath(directory),
    stat(directory),
  ]);
  if (
    real !== directory ||
    !info.isDirectory() ||
    (info.mode & 0o077) !== 0 ||
    (process.getuid && info.uid !== process.getuid())
  )
    throw new Error("Local outbox unavailable");
  return directory;
}

function cryptoContext(target: LocalOutboxTarget) {
  const scope = `${target.projectId}:${target.branchId}:${target.database}`;
  return {
    key: createHash("sha256").update(target.accessToken).digest(),
    aad: Buffer.from(scope),
  };
}

export async function writeLocalOutbox(
  target: LocalOutboxTarget,
  message: AccountEmailMessage,
) {
  const directory = await secureDirectory();
  const id = randomUUID();
  const now = Date.now();
  const entry: LocalOutboxEntry = {
    ...message,
    id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MINUTES[message.kind] * 60_000).toISOString(),
  };
  const { key, aad } = cryptoContext(target);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(entry), "utf8"),
    cipher.final(),
  ]);
  const payload = JSON.stringify({
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  });
  const handle = await open(
    path.join(directory, `${id}.json`),
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_WRONLY |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(payload, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function readLocalOutbox(target: LocalOutboxTarget) {
  const directory = await secureDirectory();
  const names = (await readdir(directory)).filter((name) => FILE.test(name));
  if (names.length > 1000) throw new Error("Local outbox unavailable");
  const { key, aad } = cryptoContext(target);
  const entries: LocalOutboxEntry[] = [];
  for (const name of names) {
    const file = path.join(directory, name);
    const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await handle.stat();
      if (
        !info.isFile() ||
        info.size > 16_384 ||
        (info.mode & 0o077) !== 0 ||
        (process.getuid && info.uid !== process.getuid())
      )
        continue;
      const payload = JSON.parse(await handle.readFile("utf8"));
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(payload.iv, "base64"),
      );
      decipher.setAAD(aad);
      decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.data, "base64")),
        decipher.final(),
      ]);
      const entry = JSON.parse(plaintext.toString("utf8")) as LocalOutboxEntry;
      if (entry.id !== name.slice(0, -5)) continue;
      const expiry = Date.parse(entry.expiresAt);
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        await unlink(file);
        continue;
      }
      entries.push(entry);
    } catch {
      // A damaged or foreign encrypted entry is never returned.
    } finally {
      await handle.close();
    }
  }
  return entries
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}
