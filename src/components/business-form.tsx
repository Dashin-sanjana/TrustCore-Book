"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { businessSchema, markets } from "@/lib/validation";
import { onboard, updateBusiness } from "@/server/actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
type Values = z.infer<typeof businessSchema>;
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
  async function submit(v: Values) {
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
    <form onSubmit={handleSubmit(submit)} className="max-w-xl space-y-5">
      <fieldset disabled={readOnly || isSubmitting} className="space-y-5">
        <div>
          <label htmlFor="business-name">Business name</label>
          <Input id="business-name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="slug">Booking address</label>
          <div className="flex items-center rounded-lg border border-border">
            <span className="pl-3 text-sm text-muted-foreground">/book/</span>
            <Input id="slug" className="border-0" {...register("slug")} />
          </div>
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Your public address. Online scheduling is not enabled yet.
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
            <label htmlFor="timezone">IANA timezone</label>
            <Input id="timezone" list="timezones" {...register("timezone")} />
            <datalist id="timezones">
              {[
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
              ].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {errors.timezone && (
              <p className="text-xs text-destructive">
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
