// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  signIn: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/actions", () => ({ register: mocks.register }));
vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

import { AuthForm } from "@/components/auth-form";

beforeEach(() => vi.resetAllMocks());

describe("authentication form feedback (server and Auth.js transport mocked)", () => {
  it("never uses a GET fallback for credentials when client JavaScript is unavailable", () => {
    render(<AuthForm mode="login" />);
    const form = screen
      .getByRole("button", { name: "Sign in" })
      .closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/login");
  });

  it("submits credentials through Auth.js without adding them to the page URL", async () => {
    mocks.signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    render(<AuthForm mode="login" />);
    const initialUrl = window.location.href;
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Email address"),
      "owner@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "private test password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledOnce());
    expect(mocks.signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "owner@example.com",
        password: "private test password",
        redirect: false,
      }),
    );
    expect(window.location.href).toBe(initialUrl);
  });
  it("shows the same generic registration result without echoing a password", async () => {
    mocks.register.mockResolvedValue({
      success:
        "If this address is available, you can sign in with your password.",
    });
    mocks.signIn.mockResolvedValue({ ok: false });
    render(<AuthForm mode="register" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "Owner");
    await user.type(
      screen.getByLabelText("Email address"),
      "owner@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "a strong password");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.register).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent(
      "If this address is available, you can sign in with your password.",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent(
      "a strong password",
    );
  });

  it("signs in after registration without putting credentials in the URL", async () => {
    mocks.register.mockResolvedValue({
      success:
        "If this address is available, you can sign in with your password.",
    });
    mocks.signIn.mockResolvedValue({ ok: true });
    render(<AuthForm mode="register" />);
    const initialUrl = window.location.href;
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "Owner");
    await user.type(
      screen.getByLabelText("Email address"),
      "owner@example.test",
    );
    await user.type(screen.getByLabelText("Password"), "a valid test password");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/app"));
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "owner@example.test",
      password: "a valid test password",
      redirect: false,
      callbackUrl: "/app",
    });
    expect(window.location.href).toBe(initialUrl);
  });

  it("keeps failed credential feedback generic", async () => {
    mocks.signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    render(<AuthForm mode="login" />);
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Email address"),
      "owner@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "wrong password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent(
      "Unable to sign in. Check your details or try again later.",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent(
      "CredentialsSignin",
    );
  });
});
