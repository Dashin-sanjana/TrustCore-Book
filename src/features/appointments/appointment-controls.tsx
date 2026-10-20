"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeAppointmentStatus } from "@/server/actions";

type Appointment = {
  id: string;
  customer: string;
  startsAt: string;
  status: string;
};
export function AppointmentControls({
  businessId,
  appointments,
  timezone,
}: {
  businessId: string;
  appointments: Appointment[];
  timezone: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function change(
    id: string,
    status: "CANCELLED" | "COMPLETED" | "NO_SHOW",
  ) {
    setBusy(id);
    setMessage("");
    try {
      const result = await changeAppointmentStatus(businessId, id, status);
      setMessage(result.error ?? result.success ?? "");
      if (result.success) router.refresh();
    } catch {
      setMessage("Unable to update appointment.");
    } finally {
      setBusy(null);
    }
  }
  const open = appointments.filter(
    (appointment) =>
      appointment.status === "PENDING" || appointment.status === "CONFIRMED",
  );
  if (!open.length) return null;
  return (
    <section
      className="mt-8 border-t border-border pt-6"
      aria-label="Manage appointments"
    >
      <h2 className="text-lg font-semibold">Manage appointments</h2>
      <div className="mt-4 divide-y divide-border border-y border-border">
        {open.map((appointment) => (
          <div
            key={appointment.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
          >
            <div>
              <strong>{appointment.customer}</strong>
              <span className="ml-2 text-muted-foreground">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: timezone,
                }).format(new Date(appointment.startsAt))}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === appointment.id}
                className="rounded-md border border-border px-3 py-2"
                onClick={() => change(appointment.id, "COMPLETED")}
              >
                Complete
              </button>
              <button
                type="button"
                disabled={busy === appointment.id}
                className="rounded-md border border-border px-3 py-2"
                onClick={() => change(appointment.id, "NO_SHOW")}
              >
                No-show
              </button>
              <button
                type="button"
                disabled={busy === appointment.id}
                className="rounded-md border border-border px-3 py-2"
                onClick={() => change(appointment.id, "CANCELLED")}
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
