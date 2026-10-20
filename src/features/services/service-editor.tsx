"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { editCatalogRecord } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  active: boolean;
};
function ServiceRow({
  businessId,
  service,
  currency,
}: {
  businessId: string;
  service: Service;
  currency: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(service.name);
  const [durationMinutes, setDuration] = useState(
    String(service.durationMinutes),
  );
  const [price, setPrice] = useState(service.price);
  const [active, setActive] = useState(service.active);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const result = await editCatalogRecord(businessId, "services", {
        id: service.id,
        name,
        durationMinutes,
        price,
        active,
      });
      setMessage(result.error ?? result.success ?? "");
      if (result.success) router.refresh();
    } catch {
      setMessage("Unable to update service.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="border-b border-border py-5">
      <summary className="cursor-pointer font-semibold">
        {service.name}{" "}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {service.active ? "Active" : "Inactive"}
        </span>
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`service-name-${service.id}`}>Name</label>
          <Input
            id={`service-name-${service.id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor={`service-duration-${service.id}`}>
            Duration (minutes)
          </label>
          <Input
            id={`service-duration-${service.id}`}
            type="number"
            min="5"
            max="720"
            value={durationMinutes}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`service-price-${service.id}`}>
            Price ({currency})
          </label>
          <Input
            id={`service-price-${service.id}`}
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Available for booking
      </label>
      <Button className="mt-4" type="button" disabled={busy} onClick={save}>
        Save service
      </Button>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </details>
  );
}
export function ServiceEditor({
  businessId,
  services,
  currency,
}: {
  businessId: string;
  services: Service[];
  currency: string;
}) {
  return (
    <section
      className="mt-8 border-t border-border"
      aria-label="Manage services"
    >
      <h2 className="pt-6 text-lg font-semibold">Manage services</h2>
      {services.map((service) => (
        <ServiceRow
          key={service.id}
          businessId={businessId}
          service={service}
          currency={currency}
        />
      ))}
    </section>
  );
}
