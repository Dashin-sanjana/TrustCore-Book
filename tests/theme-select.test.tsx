// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
const setTheme = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-color-theme", () => ({
  useColorTheme: () => ({ theme: "system", setTheme }),
}));
import { ThemeSelect } from "@/components/theme-select";
it("offers an accessible theme choice and passes the selected theme", async () => {
  render(<ThemeSelect />);
  await userEvent
    .setup()
    .selectOptions(
      screen.getByRole("combobox", { name: "Color theme" }),
      "dark",
    );
  expect(setTheme).toHaveBeenCalledWith("dark");
});
