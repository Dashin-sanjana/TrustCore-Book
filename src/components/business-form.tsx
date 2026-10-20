"use client";
import { useState, useSyncExternalStore } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { businessSchema, markets } from "@/lib/validation";
import { onboard, updateBusiness } from "@/server/actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
type Values = z.infer<typeof businessSchema>;
const subscribe = () => () => {};
const commonTimezones = [
  "Asia/Colombo",
  "Indian/Maldives",
  "Asia/Dubai",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Australia/Hobart",
  "Europe/London",
  "America/New_York",
];

function bookingSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
export function BusinessForm({
  businessId,
  initial,
  readOnly = false,
}: {
  businessId?: string;
  initial?: Values;
  readOnly?: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(businessSchema),
    defaultValues: initial ?? {
      country: "LK",
      timezone: "Asia/Colombo",
      name: "",
      slug: "",
    },
  });
  const [message, setMessage] = useState("");
  const [slugEdited, setSlugEdited] = useState(!!businessId || !!initial?.slug);
  const slug = useWatch({ control, name: "slug" });
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
  const [timezones, setTimezones] = useState(commonTimezones);
  async function submit(v: Values) {
    setMessage("");
    try {
      const result = businessId
        ? await updateBusiness(businessId, v)
        : await onboard(v);
      setMessage(result.error ?? result.success ?? "");
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT")
        throw error;
      setMessage("Unable to save. Please try again.");
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <fieldset disabled={readOnly || isSubmitting} className="space-y-5">
        <div>
          <label htmlFor="business-name">Business name</label>
          <Input
            id="business-name"
            autoComplete="organization"
            placeholder="e.g. TrustCore Studio"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "business-name-error" : undefined}
            {...register("name", {
              onChange: (event) => {
                if (!slugEdited)
                  setValue("slug", bookingSlug(event.target.value), {
                    shouldValidate: !!errors.slug,
                  });
              },
            })}
          />
          {errors.name && (
            <p
              id="business-name-error"
              className="mt-2 text-xs text-destructive"
            >
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="slug">Booking address</label>
          <div className="flex items-center overflow-hidden rounded-lg border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
            <span
              aria-hidden="true"
              className="pl-3 text-sm text-muted-foreground"
            >
              /book/
            </span>
            <Input
              id="slug"
              className="booking-address-input min-w-0"
              placeholder="your-business"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!errors.slug}
              aria-describedby={`booking-address-hint${errors.slug ? " booking-address-error" : ""}`}
              {...register("slug", {
                onChange: () => {
                  setSlugEdited(true);
                },
              })}
            />
          </div>
          {errors.slug && (
            <p
              id="booking-address-error"
              className="mt-2 text-xs text-destructive"
            >
              {errors.slug.message}
            </p>
          )}
          <p
            id="booking-address-hint"
            className="mt-2 text-xs leading-5 text-muted-foreground"
          >
            {slug ? (
              <span className="block break-all font-medium text-foreground">
                {origin}/book/{slug}
              </span>
            ) : (
              "Your booking link will appear here."
            )}
            Generated from your business name. You can edit it using lowercase
            letters, numbers and hyphens.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="country">Country</label>
            <select
              id="country"
              className="input"
              {...register("country")}
              onChange={(e) => {
                const country = e.target.value as Values["country"];
                setValue("country", country);
                setValue("timezone", markets[country].timezone);
              }}
            >
              {Object.entries(markets).map(([code, market]) => (
                <option key={code} value={code}>
                  {market.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timezone">Time zone</label>
            <Input
              id="timezone"
              list="timezones"
              autoComplete="off"
              placeholder="Search city or time zone"
              aria-invalid={!!errors.timezone}
              aria-describedby="timezone-hint"
              {...register("timezone")}
              onFocus={() => {
                try {
                  setTimezones(
                    [
                      ...new Set([
                        ...commonTimezones,
                        ...Intl.supportedValuesOf("timeZone"),
                      ]),
                    ].sort(),
                  );
                } catch {
                  /* Common time zones remain available in older browsers. */
                }
              }}
            />
            <datalist id="timezones">
              {timezones.map((t) => (
                <option
                  key={t}
                  value={t}
                  label={t.split("/").at(-1)?.replaceAll("_", " ")}
                />
              ))}
            </datalist>
            <p
              id="timezone-hint"
              className="mt-2 text-xs text-muted-foreground"
            >
              Search a city, such as Colombo or Sydney.
            </p>
            {errors.timezone && (
              <p className="mt-2 text-xs text-destructive">
                {errors.timezone.message}
              </p>
            )}
          </div>
        </div>
        {!readOnly && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving…"
              : businessId
                ? "Save settings"
                : "Create business"}
          </Button>
        )}
      </fieldset>
      {message && (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
