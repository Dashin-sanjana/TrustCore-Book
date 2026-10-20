import { describe, expect, it } from "vitest";
import {
  issueBookingClient,
  verifyBookingClient,
} from "@/server/anonymous-booking";

describe("anonymous booking client identifiers", () => {
  const secret = "test-only-signing-secret";

  it("accepts only an intact signed identifier", () => {
    const issued = issueBookingClient(secret);
    expect(verifyBookingClient(issued.value, secret)).toBe(issued.id);
    expect(verifyBookingClient(issued.value, "different-secret")).toBeNull();
    const differentFirstCharacter = issued.value[0] === "A" ? "B" : "A";
    expect(
      verifyBookingClient(
        `${differentFirstCharacter}${issued.value.slice(1)}`,
        secret,
      ),
    ).toBeNull();
    expect(verifyBookingClient("forged", secret)).toBeNull();
  });

  it("issues independent browser identifiers", () => {
    expect(issueBookingClient(secret).id).not.toBe(
      issueBookingClient(secret).id,
    );
  });
});
