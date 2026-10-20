import { AuthHandler } from "../node_modules/next-auth/core/index.js";
import { encode } from "next-auth/jwt";
import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  findCredentialsUser: vi.fn(),
  createSession: vi.fn(),
  findActiveSession: vi.fn(),
  revokeSession: vi.fn(),
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXTAUTH_SECRET: "test-only-auth-secret-1234567890123456" }),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  RateLimitExceededError: mocks.RateLimitExceededError,
}));
vi.mock("@/server/repositories/identity", () => ({
  findCredentialsUser: mocks.findCredentialsUser,
  createSession: mocks.createSession,
  findActiveSession: mocks.findActiveSession,
  revokeSession: mocks.revokeSession,
}));

import { authOptions } from "@/lib/auth";

function invoke(
  action: "csrf" | "callback" | "session" | "signout",
  body: Record<string, string> = {},
  cookies: Record<string, string> = {},
) {
  return AuthHandler({
    req: {
      action,
      providerId: action === "callback" ? "credentials" : undefined,
      method: action === "csrf" || action === "session" ? "GET" : "POST",
      headers: { host: "localhost" },
      query: {},
      body,
      cookies,
    },
    options: authOptions(),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findCredentialsUser.mockResolvedValue(null);
});

describe("CURRENT Auth.js core CSRF boundary (real AuthHandler, mocked identity storage)", () => {
  it("signs in with valid credentials, persists a session, and revokes it on logout", async () => {
    const csrf = await invoke("csrf");
    const csrfToken = (csrf.body as { csrfToken: string }).csrfToken;
    const csrfCookie = csrf.cookies?.find((item) =>
      item.name.includes("csrf-token"),
    );
    if (!csrfCookie) throw new Error("CSRF cookie missing");
    mocks.findCredentialsUser.mockResolvedValue({
      id: "u1",
      name: "Owner",
      email: "owner@example.com",
      passwordHash: await hash("valid test password", 4),
      credentialVersion: 0,
      emailVerificationRequired: true,
      emailVerifiedAt: new Date(),
    });
    mocks.createSession.mockResolvedValue({ id: "s1" });
    mocks.findActiveSession.mockResolvedValue({
      id: "s1",
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "u1", name: "Owner", email: "owner@example.com" },
    });
    const signIn = await invoke(
      "callback",
      {
        email: "owner@example.com",
        password: "valid test password",
        csrfToken,
      },
      { [csrfCookie.name]: csrfCookie.value },
    );
    const sessionCookie = signIn.cookies?.find((item) =>
      item.name.endsWith("session-token"),
    );
    expect(sessionCookie).toBeDefined();
    expect(mocks.createSession).toHaveBeenCalledOnce();
    const cookies = {
      [csrfCookie.name]: csrfCookie.value,
      [sessionCookie!.name]: sessionCookie!.value,
    };
    const session = await invoke("session", {}, cookies);
    expect(session.body).toMatchObject({
      user: { id: "u1", email: "owner@example.com" },
      sessionId: "s1",
    });
    expect(mocks.findActiveSession).toHaveBeenCalledWith("s1", "u1");
    await invoke("signout", { csrfToken }, cookies);
    expect(mocks.revokeSession).toHaveBeenCalledExactlyOnceWith("s1");
  });
  it("rejects missing and mismatched CSRF submissions before Credentials authorize", async () => {
    const csrf = await invoke("csrf");
    const token = (csrf.body as { csrfToken: string }).csrfToken;
    const cookie = csrf.cookies?.find((item) =>
      item.name.includes("csrf-token"),
    );
    expect(token).toBeTruthy();
    expect(cookie).toBeDefined();
    const credentials = { email: "absent@example.com", password: "a password" };

    await invoke("callback", credentials);
    expect(mocks.findCredentialsUser).not.toHaveBeenCalled();

    await invoke(
      "callback",
      { ...credentials, csrfToken: "wrong-token" },
      { [cookie!.name]: cookie!.value },
    );
    expect(mocks.findCredentialsUser).not.toHaveBeenCalled();

    // The valid control proves these failures occurred at Auth.js CSRF validation.
    await invoke(
      "callback",
      { ...credentials, csrfToken: token },
      { [cookie!.name]: cookie!.value },
    );
    expect(mocks.findCredentialsUser).toHaveBeenCalledWith(
      "absent@example.com",
    );
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("requires CSRF for sign-out and invokes JWT-linked revocation when valid", async () => {
    const csrf = await invoke("csrf");
    const token = (csrf.body as { csrfToken: string }).csrfToken;
    const cookie = csrf.cookies?.find((item) =>
      item.name.includes("csrf-token"),
    );
    if (!cookie) throw new Error("CSRF cookie missing");
    const jwt = await encode({
      token: { sub: "u1", sid: "s1" },
      secret: "test-only-auth-secret-1234567890123456",
      maxAge: 28800,
    });
    const cookies = {
      [cookie.name]: cookie.value,
      "next-auth.session-token": jwt,
    };

    await invoke("signout", {}, cookies);
    await invoke("signout", { csrfToken: "wrong-token" }, cookies);
    expect(mocks.revokeSession).not.toHaveBeenCalled();

    await invoke("signout", { csrfToken: token }, cookies);
    expect(mocks.revokeSession).toHaveBeenCalledExactlyOnceWith("s1");
  });

  it("rejects an unknown POST action without touching identity storage", async () => {
    const response = await AuthHandler({
      req: new Request("http://localhost/api/auth/unknown", { method: "POST" }),
      options: authOptions(),
    });
    expect(response.status).toBe(400);
    expect(mocks.findCredentialsUser).not.toHaveBeenCalled();
    expect(mocks.revokeSession).not.toHaveBeenCalled();
  });

  it.each([
    ["quota", new mocks.RateLimitExceededError("private quota detail")],
    ["storage", new Error("private storage detail")],
  ])(
    "redacts downstream %s errors under real Auth.js callback semantics",
    async (_, failure) => {
      const csrf = await invoke("csrf");
      const token = (csrf.body as { csrfToken: string }).csrfToken;
      const cookie = csrf.cookies?.find((item) =>
        item.name.includes("csrf-token"),
      );
      if (!cookie) throw new Error("CSRF cookie missing");
      mocks.rateLimit.mockRejectedValue(failure);
      const response = await invoke(
        "callback",
        {
          email: "absent@example.com",
          password: "a password",
          csrfToken: token,
        },
        { [cookie.name]: cookie.value },
      );
      expect(response.status).toBe(401);
      expect(response.redirect).not.toContain("private");
      expect(mocks.findCredentialsUser).not.toHaveBeenCalled();
    },
  );
  it("redacts credential repository failures from the Auth.js redirect", async () => {
    const csrf = await invoke("csrf");
    const token = (csrf.body as { csrfToken: string }).csrfToken;
    const cookie = csrf.cookies?.find((item) =>
      item.name.includes("csrf-token"),
    );
    if (!cookie) throw new Error("CSRF cookie missing");
    mocks.findCredentialsUser.mockRejectedValue(
      new Error("private database diagnostic"),
    );
    const response = await invoke(
      "callback",
      { email: "absent@example.com", password: "a password", csrfToken: token },
      { [cookie.name]: cookie.value },
    );
    expect(response.status).toBe(401);
    expect(response.redirect).not.toContain("private");
  });
});
