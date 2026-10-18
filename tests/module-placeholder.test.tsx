// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { modules } from "@/features/registry";
describe("unfinished module UX", () => {
  it("clearly marks unavailable features without a fake action", () => {
    const feature = modules.find((m) => m.id === "payments")!;
    render(<ModulePlaceholder module={feature} />);
    expect(
      screen.getByRole("heading", { name: "Not implemented" }),
    ).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/payment successful/i)).toBeNull();
  });
});
