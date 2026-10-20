import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/server/queries";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { CalendarDays, MapPin } from "lucide-react";
import { money } from "@/lib/utils";
import { BookingForm } from "@/features/public-booking/booking-form";
import { businessLocalDate } from "@/features/booking-engine/slots";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) notFound();
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  const now = new Date();
  return (
    <>
      <header className="border-b border-border bg-card p-6">
        <Brand />
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow mb-4">A little time for yourself</p>
        <h1 className="text-4xl font-semibold">{business.name}</h1>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin size={16} />
          {business.timezone} · {business.currency}
        </p>
        {process.env.BOOKING_MVP_ENABLED === "true" &&
        business.services.length ? (
          <BookingForm
            slug={slug}
            timezone={business.timezone}
            minDate={businessLocalDate(now, business.timezone)}
            maxDate={businessLocalDate(
              new Date(now.getTime() + 57 * 86400_000),
              business.timezone,
            )}
            services={business.services.map((service) => ({
              ...service,
              price: service.price.toString(),
            }))}
          />
        ) : (
          <div className="my-8 border-y border-border py-6">
            <CalendarDays className="mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">
              Online booking is not available yet. Please contact the business
              directly.
            </p>
          </div>
        )}
        <h2 className="mb-5 text-xl font-semibold">Services</h2>
        {business.services.length ? (
          <div className="space-y-3">
            {business.services.map((s, i) => (
              <Card key={i} className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.durationMinutes} minutes
                  </p>
                </div>
                <p className="font-semibold">
                  {money(s.price.toString(), business.currency)}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            The service menu is being prepared.
          </p>
        )}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Powered by TrustCore Book · TrustCore Labs
        </p>
      </main>
    </>
  );
}
