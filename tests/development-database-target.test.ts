import { describe, expect, it } from "vitest";
import { approvedDevelopmentDatabase } from "./development-database-target";

const host = "ep-example.c-7.us-east-2.aws.neon.tech";
const url = `postgresql://test:test@${host}/neondb?sslmode=verify-full`;
const env = {
  DEV_NEON_TARGET_VERIFIED: "YES",
  DEV_NEON_PROJECT_ID: "fragrant-hat-50630079",
  DEV_NEON_BRANCH_ID: "br-dark-brook-b4vdolwu",
  DEV_NEON_ENDPOINT: host,
};

describe("new development database test gate", () => {
  it("accepts only the exact externally verified project, branch and direct URL", () => {
    expect(approvedDevelopmentDatabase(url, env)).toBe(true);
    expect(
      approvedDevelopmentDatabase(url, {
        ...env,
        DEV_NEON_TARGET_VERIFIED: "",
      }),
    ).toBe(false);
    expect(
      approvedDevelopmentDatabase(url, {
        ...env,
        DEV_NEON_PROJECT_ID: "quiet-mouse-55892784",
      }),
    ).toBe(false);
    expect(
      approvedDevelopmentDatabase(url, {
        ...env,
        DEV_NEON_BRANCH_ID: "br-other",
      }),
    ).toBe(false);
    expect(
      approvedDevelopmentDatabase(
        url.replace(host, "ep-other.c-7.us-east-2.aws.neon.tech"),
        env,
      ),
    ).toBe(false);
    expect(
      approvedDevelopmentDatabase(url.replace("/neondb", "/other"), env),
    ).toBe(false);
    expect(
      approvedDevelopmentDatabase(url.replace("verify-full", "require"), env),
    ).toBe(false);
    expect(
      approvedDevelopmentDatabase(
        url.replace("ep-example", "ep-example-pooler"),
        {
          ...env,
          DEV_NEON_ENDPOINT: host.replace("ep-example", "ep-example-pooler"),
        },
      ),
    ).toBe(false);
  });
});
