import { afterEach } from "vitest";
// Node security/integration suites stay in node; component tests opt into jsdom.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  await import("@testing-library/jest-dom/vitest");
  afterEach(cleanup);
}
