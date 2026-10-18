import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "generated") continue;
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(name)));
    else if (/\.[cm]?[jt]sx?$/.test(name)) files.push(name);
  }
  return files;
}
const failures = [];
for (const file of await walk("src")) {
  const source = await readFile(file, "utf8");
  const imports = [
    ...source.matchAll(/(?:from\s*|import\s*\()(["'])([^"']+)\1/g),
  ].map((m) => m[2]);
  const normalized = file.split(path.sep).join("/");
  for (const specifier of imports) {
    if (
      (specifier === "@/lib/db" ||
        specifier?.startsWith("@/generated/prisma")) &&
      normalized !== "src/lib/db.ts" &&
      !normalized.startsWith("src/server/repositories/") &&
      !(
        normalized === "src/server/services.ts" &&
        specifier === "@/generated/prisma/client"
      )
    )
      failures.push(`${file}: Prisma access belongs in a repository`);
    if (
      /^\s*["']use client["']/.test(source) &&
      /(?:@\/server\/|\/server\/|@\/lib\/(?:db|auth|env)$)/.test(
        specifier ?? "",
      ) &&
      specifier !== "@/server/actions"
    )
      failures.push(`${file}: browser imports server code`);
  }
  if (
    normalized.startsWith("src/server/repositories/") &&
    !source.includes('import "server-only"')
  )
    failures.push(`${file}: repository must be server-only`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("Architecture boundaries passed.");
