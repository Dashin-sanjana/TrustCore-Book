import { modules } from "@/features/registry";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { ModuleDirectory } from "@/components/module-directory";
import { requireTenant } from "@/server/authorization";
import { notFound } from "next/navigation";
import { getWorkspace } from "@/server/queries";
import { canManage, type businessSchema } from "@/lib/validation";
import { DataTable } from "@/components/data-table";
import { RecordForm } from "@/components/record-form";
import { BusinessForm } from "@/components/business-form";
import { Card } from "@/components/ui/card";
import { localTime, money } from "@/lib/utils";
import type { z } from "zod";
const config = {
  appointments: {
    title: "Appointments",
    desc: "An overview of your business’s recorded appointments.",
  },
  services: {
    title: "Services",
    desc: "The craft, care and expertise your business offers.",
  },
  staff: {
    title: "Your team",
    desc: "The people who make your business what it is.",
  },
  customers: {
    title: "Customers",
    desc: "Keep the details behind every good relationship.",
  },
  settings: {
    title: "Business settings",
    desc: "The essentials that make this workspace yours.",
  },
};
export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string; section: string }>;
}) {
  const { businessId, section } = await params;
  if (!Object.hasOwn(config, section)) {
    const scope = await requireTenant(businessId);
    if (section === "modules")
      return (
        <ModuleDirectory
          businessId={businessId}
          platformAdmin={scope.user.platformAdmin}
        />
      );
    const feature = modules.find((m) => m.route === section);
    if (!feature) notFound();
    return <ModulePlaceholder module={feature} />;
  }
  const key = section as keyof typeof config;
  const data = await getWorkspace(businessId);
  const { business, member } = data;
  const manage = canManage(member.role);
  let columns: { key: string; label: string }[] = [];
  let rows: Record<string, string>[] = [];
  if (key === "services") {
    columns = [
      { key: "name", label: "Service" },
      { key: "duration", label: "Duration" },
      { key: "price", label: "Price" },
      { key: "status", label: "Status" },
    ];
    rows = data.services.map((s) => ({
      name: s.name,
      duration: `${s.durationMinutes} min`,
      price: money(s.price.toString(), business.currency),
      status: s.active ? "Active" : "Inactive",
    }));
  }
  if (key === "staff") {
    columns = [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
    ];
    rows = data.staff.map((s) => ({
      name: s.name,
      status: s.active ? "Active" : "Inactive",
    }));
  }
  if (key === "customers") {
    columns = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
    ];
    rows = data.customers.map((c) => ({
      name: c.name,
      email: c.email ?? "—",
      phone: c.phone ?? "—",
    }));
  }
  if (key === "appointments") {
    columns = [
      { key: "time", label: `Time (${business.timezone})` },
      { key: "customer", label: "Customer" },
      { key: "service", label: "Service" },
      { key: "staff", label: "Staff" },
      { key: "status", label: "Status" },
    ];
    rows = data.appointments.map((a) => ({
      time: localTime(a.startsAt, business.timezone),
      customer: a.customer.name,
      service: a.service.name,
      staff: a.staff.name,
      status: a.status.toLowerCase().replaceAll("_", " "),
    }));
  }
  return (
    <>
      <p className="eyebrow mb-3">Your workspace</p>
      <h1 className="text-3xl font-semibold">{config[key].title}</h1>
      <p className="mb-8 mt-2 text-sm leading-6 text-muted-foreground">
        {config[key].desc}
      </p>
      {key === "services" && (
        <p className="mb-5 text-sm text-muted-foreground">
          Not implemented: service categories and edit/archive workflows.
        </p>
      )}
      {key === "settings" ? (
        <Card>
          <h2 className="mb-6 text-lg font-semibold">Business profile</h2>
          {!manage && (
            <p className="mb-5 text-sm text-muted-foreground">
              An owner or admin can update these settings.
            </p>
          )}
          <BusinessForm
            businessId={businessId}
            readOnly={!manage}
            initial={{
              name: business.name,
              slug: business.slug,
              country: business.country as z.infer<
                typeof businessSchema
              >["country"],
              timezone: business.timezone,
            }}
          />
          <p className="mt-7 border-t border-border pt-5 text-xs text-muted-foreground">
            Currency: {business.currency}. Country changes require support once
            your business is created.
          </p>
        </Card>
      ) : (
        <>
          {manage &&
            (key === "services" || key === "staff" || key === "customers") && (
              <RecordForm
                businessId={businessId}
                kind={key}
                currency={business.currency}
              />
            )}
          {key === "appointments" && (
            <p className="mb-6 rounded-lg border border-border bg-accent p-4 text-sm text-muted-foreground">
              Not implemented: online booking. Appointment creation will be
              added with the booking engine.
            </p>
          )}
          <DataTable
            columns={columns}
            rows={rows}
            emptyTitle={
              key === "appointments"
                ? "No appointments yet"
                : `Your ${key === "staff" ? "team directory" : key === "customers" ? "customer directory" : "service menu"} starts here`
            }
            emptyDescription={
              key === "appointments"
                ? "Recorded appointments will appear here once scheduling is enabled."
                : manage
                  ? "Use the add form above to create your first record."
                  : "An owner or admin can add records to this workspace."
            }
          />
          {(key === "customers" || key === "appointments") && (
            <p className="mt-4 text-xs text-muted-foreground">
              Showing up to the 100 most recent records.
            </p>
          )}
        </>
      )}
    </>
  );
}
