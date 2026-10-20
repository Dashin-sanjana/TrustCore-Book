"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addStaffTimeOff,
  editCatalogRecord,
  removeStaffTimeOff,
  saveStaffSchedule,
} from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Rule = { weekday: number; startMinute: number; endMinute: number };
type Staff = {
  id: string;
  name: string;
  active: boolean;
  serviceIds: string[];
  rules: Rule[];
  timeOff: { id: string; startsAt: string; endsAt: string }[];
};
type Service = { id: string; name: string; active: boolean };
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const clock = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const minutes = (value: string) => {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
};

function StaffRow({
  businessId,
  staff,
  services,
  timezone,
  today,
}: {
  businessId: string;
  staff: Staff;
  services: Service[];
  timezone: string;
  today: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(staff.name);
  const [active, setActive] = useState(staff.active);
  const [assigned, setAssigned] = useState(staff.serviceIds);
  const [rules, setRules] = useState<Rule[]>(staff.rules);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const setDay = (weekday: number, rule?: Rule) =>
    setRules((current) => [
      ...current.filter((item) => item.weekday !== weekday),
      ...(rule ? [rule] : []),
    ]);
  async function saveProfile() {
    setBusy(true);
    setMessage("");
    try {
      const result = await editCatalogRecord(businessId, "staff", {
        id: staff.id,
        name,
        active,
      });
      setMessage(result.error ?? result.success ?? "");
      if (result.success) router.refresh();
    } catch {
      setMessage("Unable to save staff details.");
    } finally {
      setBusy(false);
    }
  }
  async function saveSchedule() {
    setBusy(true);
    setMessage("");
    try {
      const result = await saveStaffSchedule(businessId, {
        staffId: staff.id,
        serviceIds: assigned,
        rules,
      });
      setMessage(result.error ?? result.success ?? "");
      if (result.success) router.refresh();
    } catch {
      setMessage("Unable to save schedule.");
    } finally {
      setBusy(false);
    }
  }
  async function addTimeOff(form: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const result = await addStaffTimeOff(businessId, {
        staffId: staff.id,
        startDate: form.get("startDate"),
        startTime: form.get("startTime"),
        endDate: form.get("endDate"),
        endTime: form.get("endTime"),
      });
      setMessage(result.error ?? result.success ?? "");
      if (result.success) router.refresh();
    } catch {
      setMessage("Unable to save time off.");
    } finally {
      setBusy(false);
    }
  }
  async function removeTimeOff(id: string) {
    setBusy(true);
    setMessage("");
    try {
      const result = await removeStaffTimeOff(businessId, staff.id, id);
      setMessage(result.error ?? result.success ?? "");
      if (result.success) router.refresh();
    } catch {
      setMessage("Unable to remove time off.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="border-b border-border py-5">
      <summary className="cursor-pointer font-semibold">
        {staff.name}{" "}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {staff.active ? "Active" : "Inactive"}
        </span>
      </summary>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section aria-label={`${staff.name} details`}>
          <label htmlFor={`staff-name-${staff.id}`}>Name</label>
          <Input
            id={`staff-name-${staff.id}`}
            value={name}
            minLength={2}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />{" "}
            Active for new bookings
          </label>
          <Button
            className="mt-4"
            type="button"
            disabled={busy}
            onClick={saveProfile}
          >
            Save details
          </Button>
        </section>
        <section aria-label={`${staff.name} schedule`}>
          <h3 className="text-sm font-semibold">Services</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {services
              .filter(
                (service) => service.active || assigned.includes(service.id),
              )
              .map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={assigned.includes(service.id)}
                    disabled={!service.active}
                    onChange={(event) =>
                      setAssigned((current) =>
                        event.target.checked
                          ? [...current, service.id]
                          : current.filter((id) => id !== service.id),
                      )
                    }
                  />
                  {service.name}
                </label>
              ))}
          </div>
          <h3 className="mt-5 text-sm font-semibold">Weekly hours</h3>
          <div className="mt-2 space-y-2">
            {days.map((day, weekday) => {
              const rule = rules.find((item) => item.weekday === weekday);
              return (
                <div
                  key={day}
                  className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2 text-sm sm:grid-cols-[7rem_1fr_1fr]"
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!rule}
                      onChange={(event) =>
                        setDay(
                          weekday,
                          event.target.checked
                            ? { weekday, startMinute: 540, endMinute: 1020 }
                            : undefined,
                        )
                      }
                    />
                    {day}
                  </label>
                  <input
                    aria-label={`${day} start`}
                    type="time"
                    className="h-9 min-w-0 rounded-md border border-border bg-background px-1"
                    disabled={!rule}
                    value={clock(rule?.startMinute ?? 540)}
                    onChange={(event) =>
                      rule &&
                      setDay(weekday, {
                        ...rule,
                        startMinute: minutes(event.target.value),
                      })
                    }
                  />
                  <input
                    aria-label={`${day} end`}
                    type="time"
                    className="h-9 min-w-0 rounded-md border border-border bg-background px-1"
                    disabled={!rule}
                    value={clock(rule?.endMinute ?? 1020)}
                    onChange={(event) =>
                      rule &&
                      setDay(weekday, {
                        ...rule,
                        endMinute: minutes(event.target.value),
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
          <Button
            className="mt-4"
            type="button"
            disabled={busy}
            onClick={saveSchedule}
          >
            Save schedule
          </Button>
          <div className="mt-7 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Time off ({timezone})</h3>
            <form action={addTimeOff} className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`off-start-date-${staff.id}`}>From date</label>
                <Input
                  id={`off-start-date-${staff.id}`}
                  name="startDate"
                  type="date"
                  min={today}
                  defaultValue={today}
                  required
                />
              </div>
              <div>
                <label htmlFor={`off-start-time-${staff.id}`}>From time</label>
                <Input
                  id={`off-start-time-${staff.id}`}
                  name="startTime"
                  type="time"
                  defaultValue="09:00"
                  required
                />
              </div>
              <div>
                <label htmlFor={`off-end-date-${staff.id}`}>To date</label>
                <Input
                  id={`off-end-date-${staff.id}`}
                  name="endDate"
                  type="date"
                  min={today}
                  defaultValue={today}
                  required
                />
              </div>
              <div>
                <label htmlFor={`off-end-time-${staff.id}`}>To time</label>
                <Input
                  id={`off-end-time-${staff.id}`}
                  name="endTime"
                  type="time"
                  defaultValue="17:00"
                  required
                />
              </div>
              <Button
                className="col-span-2 justify-self-start"
                type="submit"
                disabled={busy}
              >
                Add time off
              </Button>
            </form>
            {staff.timeOff.length > 0 && (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {staff.timeOff.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 text-xs"
                  >
                    <span>
                      {new Intl.DateTimeFormat("en", {
                        timeZone: timezone,
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.startsAt))}{" "}
                      to{" "}
                      {new Intl.DateTimeFormat("en", {
                        timeZone: timezone,
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.endsAt))}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border border-border px-2 py-1"
                      onClick={() => removeTimeOff(item.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </details>
  );
}

export function StaffEditor({
  businessId,
  staff,
  services,
  timezone,
  today,
}: {
  businessId: string;
  staff: Staff[];
  services: Service[];
  timezone: string;
  today: string;
}) {
  return (
    <section
      className="mt-8 border-t border-border"
      aria-label="Manage staff schedules"
    >
      <h2 className="pt-6 text-lg font-semibold">Staff and weekly schedules</h2>
      {staff.map((person) => (
        <StaffRow
          key={person.id}
          businessId={businessId}
          staff={person}
          services={services}
          timezone={timezone}
          today={today}
        />
      ))}
    </section>
  );
}
