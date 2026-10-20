// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
  revokeAllOwnSessions: vi.fn(),
  revokeOwnSession: vi.fn(),
  updateOwnProfile: vi.fn(),
  changeOwnPassword: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("next-auth/react", () => ({ signOut: mocks.signOut }));
vi.mock("@/server/actions", () => ({
  revokeAllOwnSessions: mocks.revokeAllOwnSessions,
  revokeOwnSession: mocks.revokeOwnSession,
  updateOwnProfile: mocks.updateOwnProfile,
  changeOwnPassword: mocks.changeOwnPassword,
}));

import { AccountSettings } from "@/components/account-settings";

const account = {
  profile: {
    name: "Owner",
    email: "owner@example.com",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  sessions: [
    {
      id: "s1",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T08:00:00.000Z",
      revokedAt: null,
      current: true,
    },
  ],
};

beforeEach(() => vi.resetAllMocks());

describe("account settings UI (server actions mocked)", () => {
  it("renders the current session and account identity without a hash", () => {
    render(<AccountSettings account={account} />);
    expect(
      screen.getByText(/Email address: owner@example.com/),
    ).toBeInTheDocument();
    expect(screen.getByText("This session")).toBeInTheDocument();
    expect(screen.queryByText("passwordHash")).not.toBeInTheDocument();
  });

  it("leaves the protected page after revoke-all even if Auth.js client cleanup fails", async () => {
    mocks.revokeAllOwnSessions.mockResolvedValue({
      success: "All sessions revoked.",
      signedOut: true,
    });
    mocks.signOut.mockRejectedValue(
      new Error("sign-out transport unavailable"),
    );
    render(<AccountSettings account={account} />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await waitFor(() => {
      expect(mocks.revokeAllOwnSessions).toHaveBeenCalledOnce();
      expect(mocks.signOut).toHaveBeenCalledWith({
        redirect: false,
        callbackUrl: "/login",
      });
      expect(mocks.replace).toHaveBeenCalledWith("/login");
    });
  });
});
