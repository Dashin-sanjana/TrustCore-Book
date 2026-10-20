import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: () => ({ businessMember: { findMany: mocks.findMany } }),
}));

import { listBusinessMembersPage } from "@/server/repositories/membership";

describe("member directory query shape (Prisma mocked)", () => {
  it("filters by business, bounds the page, and selects no credential fields", async () => {
    await listBusinessMembersPage("b1", "member-10");
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { businessId: "b1", id: { gt: "member-10" } },
      select: {
        id: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { id: "asc" },
      take: 51,
    });
  });
});
