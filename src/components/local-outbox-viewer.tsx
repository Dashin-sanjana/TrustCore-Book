"use client";

import { useState } from "react";
import type { LocalOutboxEntry } from "@/shared/contracts/local-outbox";

export function LocalOutboxViewer() {
  const [accessToken, setAccessToken] = useState("");
  const [messages, setMessages] = useState<LocalOutboxEntry[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/dev/outbox", {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("unavailable");
      const data = (await response.json()) as { messages: LocalOutboxEntry[] };
      setMessages(data.messages);
    } catch {
      setMessages([]);
      setStatus(
        "Outbox unavailable. Check local access and database verification.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Development outbox</h1>
      <form
        action="/dev/outbox"
        method="post"
        className="mt-8 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void refresh();
        }}
      >
        <label className="min-w-64 flex-1 text-sm font-medium">
          Developer access token
          <input
            type="password"
            autoComplete="off"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            className="mt-2 block w-full rounded border border-border bg-background px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !accessToken}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Loading" : "Refresh"}
        </button>
      </form>
      {status && (
        <p role="status" className="mt-4 text-sm text-destructive">
          {status}
        </p>
      )}
      <div className="mt-8 divide-y divide-border border-y border-border">
        {messages.map((message) => (
          <div
            key={message.id}
            className="grid gap-2 py-4 text-sm md:grid-cols-[11rem_1fr_auto]"
          >
            <div className="font-medium">
              {message.kind.replaceAll("_", " ")}
            </div>
            <div className="min-w-0 break-all">
              <div>{message.recipient}</div>
              <div className="text-muted-foreground">
                Expires {new Date(message.expiresAt).toLocaleString()}
              </div>
            </div>
            <a
              href={message.link}
              rel="noreferrer"
              className="self-start text-primary underline"
            >
              Open link
            </a>
          </div>
        ))}
        {!messages.length && !status && (
          <p className="py-6 text-sm text-muted-foreground">
            No active messages.
          </p>
        )}
      </div>
    </main>
  );
}
