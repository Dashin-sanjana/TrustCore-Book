// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { beforeEach, expect, it } from "vitest";
import { ThemeSelect } from "@/components/theme-select";

beforeEach(() => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  document.documentElement.className = "";
});

it("restores OS preference after selecting System theme", async () => {
  let dark = false;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return dark;
      },
      addEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => listeners.add(listener),
      removeEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => listeners.delete(listener),
      addListener: (listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
    }) as unknown as MediaQueryList;
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeSelect />
    </ThemeProvider>,
  );
  const select = screen.getByRole("combobox", { name: "Color theme" });
  await waitFor(() => expect(select).not.toBeDisabled());
  await userEvent.setup().selectOptions(select, "dark");
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
  await userEvent.setup().selectOptions(select, "system");
  await waitFor(() => expect(document.documentElement).not.toHaveClass("dark"));
  dark = true;
  for (const listener of listeners)
    listener({ matches: true } as MediaQueryListEvent);
  await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
});
