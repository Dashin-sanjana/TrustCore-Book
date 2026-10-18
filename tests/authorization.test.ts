import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  findSession: vi.fn(),
  findMember: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ authOptions: () => ({}) }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    refreshSession: { findFirst: mocks.findSession },
    businessMember: { findUnique: mocks.findMember },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
import {
  requireUser,
  requireTenant,
  requirePlatformAdmin,
} from "@/server/authorization";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "u1" }, sessionId: "s1" });
  mocks.findSession.mockResolvedValue({
    user: { id: "u1", platformAdmin: false },
  });
});
describe("authorization boundaries", () => {
  it("redirects unauthenticated users", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("redirect:/login");
  });
  it("rejects revoked or expired sessions", async () => {
    mocks.findSession.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("redirect:/login");
    expect(mocks.findSession).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "s1",
          userId: "u1",
          revokedAt: null,
          expiresAt: expect.any(Object),
        }),
      }),
    );
  });
  it("denies cross-tenant access even for a valid session", async () => {
    mocks.findMember.mockResolvedValue(null);
    await expect(requireTenant("other-tenant")).rejects.toThrow("not-found");
    expect(mocks.findMember).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId_userId: { businessId: "other-tenant", userId: "u1" },
        },
      }),
    );
  });
  it("denies writes to a read-only member", async () => {
    mocks.findMember.mockResolvedValue({
      role: "MEMBER",
      business: { id: "b1" },
    });
    await expect(requireTenant("b1", true)).rejects.toThrow("not-found");
  });
  it("permits owner operations", async () => {
    mocks.findMember.mockResolvedValue({
      role: "OWNER",
      business: { id: "b1" },
    });
    await expect(requireTenant("b1", true)).resolves.toMatchObject({
      business: { id: "b1" },
    });
  });
  it("requires explicit platform admin provisioning", async () => {
    await expect(requirePlatformAdmin()).rejects.toThrow("not-found");
  });
});
