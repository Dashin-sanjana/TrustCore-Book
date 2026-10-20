import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTenant: vi.fn(),
  listPage: vi.fn(),
}));
vi.mock("@/server/authorization", () => ({
  requireTenant: mocks.requireTenant,
}));
vi.mock("@/server/repositories/membership", () => ({
  listBusinessMembersPage: mocks.listPage,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));

import { listBusinessMembersService } from "@/server/member-management";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireTenant.mockResolvedValue({
    business: { id: "b1", name: "Book Studio" },
    member: { role: "OWNER" },
  });
  mocks.listPage.mockResolvedValue([]);
});

describe("member directory authorization (dependencies mocked)", () => {
  it("denies a read-only MEMBER before querying the directory", async () => {
    mocks.requireTenant.mockResolvedValue({
      business: { id: "b1" },
      member: { role: "MEMBER" },
    });
    await expect(listBusinessMembersService("b1")).rejects.toThrow("not-found");
    expect(mocks.listPage).not.toHaveBeenCalled();
  });

  it("propagates cross-tenant denial without querying members", async () => {
    mocks.requireTenant.mockRejectedValue(new Error("not-found"));
    await expect(listBusinessMembersService("foreign")).rejects.toThrow(
      "not-found",
    );
    expect(mocks.requireTenant).toHaveBeenCalledWith("foreign");
    expect(mocks.listPage).not.toHaveBeenCalled();
  });

  it("rejects malformed cursors before querying members", async () => {
    await expect(listBusinessMembersService("b1", "x/../b2")).rejects.toThrow(
      "not-found",
    );
    expect(mocks.listPage).not.toHaveBeenCalled();
  });

  it("returns a bounded, redacted page for a current manager", async () => {
    mocks.requireTenant.mockResolvedValue({
      business: { id: "b1", name: "Book Studio" },
      member: { role: "ADMIN" },
    });
    mocks.listPage.mockResolvedValue(
      Array.from({ length: 51 }, (_, index) => ({
        id: `member-${index.toString().padStart(2, "0")}`,
        role: "MEMBER",
        user: {
          name: `Person ${index}`,
          email: `person${index}@example.test`,
          passwordHash: "must-not-leak",
        },
      })),
    );
    const result = await listBusinessMembersService("b1", "member-00");
    expect(mocks.listPage).toHaveBeenCalledExactlyOnceWith("b1", "member-00");
    expect(result.members).toHaveLength(50);
    expect(result.nextCursor).toBe("member-49");
    expect(result.members[0]).toEqual({
      id: "member-00",
      name: "Person 0",
      email: "person0@example.test",
      role: "MEMBER",
    });
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });
});
