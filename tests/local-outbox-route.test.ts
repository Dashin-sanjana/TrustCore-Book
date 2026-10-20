import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  target: vi.fn(),
  verify: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/server/local-outbox-target", () => ({
  localOutboxTarget: mocks.target,
  verifyLocalOutboxTarget: mocks.verify,
}));
vi.mock("@/server/local-outbox", () => ({ readLocalOutbox: mocks.read }));

import { GET } from "@/app/api/dev/outbox/route";

const target = { origin: "http://localhost:3000", accessToken: "A".repeat(43) };
function request(host = "localhost:3000", token = target.accessToken) {
  return new Request("http://localhost:3000/api/dev/outbox", {
    headers: { host, authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.target.mockReturnValue(target);
  mocks.read.mockResolvedValue([]);
});

describe("development outbox route", () => {
  it("is absent when the local provider is disabled", async () => {
    mocks.target.mockReturnValue(null);
    expect((await GET(request())).status).toBe(404);
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("rejects LAN host and missing developer authorization before metadata access", async () => {
    expect((await GET(request("192.168.1.10:3000"))).status).toBe(404);
    expect((await GET(request("localhost:3000", "wrong"))).status).toBe(404);
    expect(
      (
        await GET(
          new Request("http://localhost:3000/api/dev/outbox", {
            headers: {
              host: "localhost:3000",
              authorization: target.accessToken,
            },
          }),
        )
      ).status,
    ).toBe(404);
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("serves only verified local messages without caching", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.verify).toHaveBeenCalledWith(target);
    expect(await response.json()).toEqual({ messages: [] });
  });

  it("fails closed if live target verification fails", async () => {
    mocks.verify.mockRejectedValue(new Error("not verified"));
    expect((await GET(request())).status).toBe(503);
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
