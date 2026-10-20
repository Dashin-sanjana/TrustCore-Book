import "server-only";
import { db } from "@/lib/db";

export async function verifyLocalOutboxDatabase(database: string) {
  const identity = await db().$queryRaw<{ name: string }[]>`
    SELECT current_database() AS name
  `;
  if (identity[0]?.name !== database)
    throw new Error("Local outbox target unavailable");
  const migrations = await db().$queryRaw<
    {
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }[]
  >`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name IN ('20261018000000_initial', '20261018010000_phase_a1_identity')
  `;
  if (
    migrations.length !== 2 ||
    migrations.some((row) => !row.finished_at || row.rolled_back_at)
  )
    throw new Error("Local outbox target unavailable");
}
