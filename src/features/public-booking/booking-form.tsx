"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { loadPublicSlots, submitPublicBooking } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessLocalDate } from "@/features/booking-engine/slots";

type Slot = { id: string; startsAt: string; endsAt: string; staffName: string };
type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
};

export function BookingForm({
  slug,
  timezone,
  services,
  minDate,
  maxDate,
}: {
  slug: string;
  timezone: string;
  services: Service[];
  minDate: string;
  maxDate: string;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function findSlots() {
    if (!serviceId || !date) return;
    setBusy(true);
    setMessage("");
    setSelected(null);
    setSlots([]);
    const day = Date.parse(`${date}T00:00:00Z`);
    try {
      const result = await loadPublicSlots({
        slug,
        serviceId,
        from: new Date(Math.max(day - 86400_000, Date.now())).toISOString(),
        to: new Date(day + 2 * 86400_000).toISOString(),
        localDate: date,
      });
      if ("error" in result)
        setMessage(result.error ?? "Availability is unavailable.");
      else {
        const available = result.slots.filter(
          (slot) =>
            businessLocalDate(new Date(slot.startsAt), timezone) === date,
        );
        setSlots(available);
        if (!available.length)
          setMessage("No times are available on this date.");
      }
    } catch {
      setMessage("Availability is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function book(form: FormData) {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await submitPublicBooking({
        slug,
        serviceId,
        slotId: selected.id,
        startsAt: selected.startsAt,
        idempotencyKey: key,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
      });
      if (result.success) {
        setConfirmed(true);
        setMessage(`Booking confirmed. Reference: ${result.bookingId}`);
      } else setMessage(result.error ?? "Booking is temporarily unavailable.");
    } catch {
      setMessage(
        "Booking is temporarily unavailable. Retry with the same details.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="my-8 border-t border-b border-border py-7"
      aria-label="Book an appointment"
    >
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <CalendarDays size={20} /> Book an appointment
      </h2>
      {confirmed ? (
        <p role="status" className="mt-5 text-sm">
          {message}
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="booking-service">Service</label>
              <select
                id="booking-service"
                className="h-10 w-full rounded-md border border-border bg-background px-3"
                value={serviceId}
                onChange={(event) => {
                  setServiceId(event.target.value);
                  setSlots([]);
                  setSelected(null);
                  setKey(crypto.randomUUID());
                }}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="booking-date">Date</label>
              <Input
                id="booking-date"
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSlots([]);
                  setSelected(null);
                  setKey(crypto.randomUUID());
                }}
              />
            </div>
            <Button
              type="button"
              disabled={busy || !serviceId}
              onClick={findSlots}
            >
              {busy ? "Checking..." : "Find times"}
            </Button>
          </div>
          {slots.length > 0 && (
            <div
              className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3"
              aria-label="Available times"
            >
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={selected?.id === slot.id}
                  className={`rounded-md border p-3 text-left text-sm ${selected?.id === slot.id ? "border-primary bg-accent" : "border-border"}`}
                  onClick={() => {
                    setSelected(slot);
                    setKey(crypto.randomUUID());
                    setMessage("");
                  }}
                >
                  <span className="block font-semibold">
                    {new Intl.DateTimeFormat("en", {
                      timeZone: timezone,
                      hour: "numeric",
                      minute: "2-digit",
                      timeZoneName: "shortOffset",
                    }).format(new Date(slot.startsAt))}
                  </span>
                  <span className="text-muted-foreground">
                    {slot.staffName}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <form className="mt-6 grid gap-4 sm:grid-cols-2" action={book}>
              <div>
                <label htmlFor="booking-name">Name</label>
                <Input
                  id="booking-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  onChange={() => setKey(crypto.randomUUID())}
                />
              </div>
              <div>
                <label htmlFor="booking-email">Email</label>
                <Input
                  id="booking-email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  onChange={() => setKey(crypto.randomUUID())}
                />
              </div>
              <div>
                <label htmlFor="booking-phone">Phone (optional)</label>
                <Input
                  id="booking-phone"
                  name="phone"
                  type="tel"
                  maxLength={30}
                  onChange={() => setKey(crypto.randomUUID())}
                />
              </div>
              <div className="flex items-end">
                <Button disabled={busy} type="submit">
                  {busy ? "Booking..." : "Confirm booking"}
                </Button>
              </div>
            </form>
          )}
          {message && (
            <p role="status" className="mt-5 text-sm">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
