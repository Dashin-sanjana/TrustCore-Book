import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Sparkles,
  Users,
  Contact,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { getDashboard } from "@/server/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { business, user, appointments, services, staff, customers } =
    await getDashboard(businessId);
  const setup = [
    {
      title: "Add your services",
      text: "Give your craft a name, duration and price.",
      done: services > 0,
      path: "services",
    },
    {
      title: "Introduce your team",
      text: "Bring the people behind your business together.",
      done: staff > 0,
      path: "staff",
    },
    {
      title: "Build your customer directory",
      text: "Keep the details that help you care for customers.",
      done: customers > 0,
      path: "customers",
    },
  ];
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-3">A clearer view of your business</p>
          <h1 className="text-3xl font-semibold">
            Welcome, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Here’s where things stand at {business.name}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/app/${businessId}/settings`}>
            Business settings <ArrowRight size={15} />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            title: "Appointments",
            count: appointments,
            icon: CalendarDays,
            path: "appointments",
            note: "All recorded appointments",
          },
          {
            title: "Active services",
            count: services,
            icon: Sparkles,
            path: "services",
            note: "In your service menu",
          },
          {
            title: "Team members",
            count: staff,
            icon: Users,
            path: "staff",
            note: "Active staff profiles",
          },
          {
            title: "Customers",
            count: customers,
            icon: Contact,
            path: "customers",
            note: "In your directory",
          },
        ].map((item) => (
          <Link key={item.title} href={`/app/${businessId}/${item.path}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <item.icon size={18} className="text-primary" />
              </div>
              <p className="mt-5 text-3xl font-semibold">{item.count}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-7 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Build your foundation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A few simple steps to make this space yours.
              </p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
              {setup.filter((s) => s.done).length} / 3
            </span>
          </div>
          <div className="space-y-2">
            {setup.map((s) => (
              <Link
                key={s.path}
                href={`/app/${businessId}/${s.path}`}
                className="flex items-center gap-4 rounded-xl p-4 hover:bg-background"
              >
                {s.done ? (
                  <CheckCircle2 size={22} className="shrink-0 text-primary" />
                ) : (
                  <Circle
                    size={22}
                    className="shrink-0 text-muted-foreground"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {s.text}
                  </p>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
        <Card className="bg-accent shadow-none">
          <CalendarDays className="mb-6 text-primary" size={28} />
          <p className="eyebrow mb-3">On the horizon</p>
          <h2 className="text-2xl font-semibold">A better booking day.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Online scheduling is being prepared. Set up your services and team
            now so you’re ready for the next step.
          </p>
          <div className="mt-7 border-t border-primary/20 pt-5 text-xs leading-6 text-muted-foreground">
            Business timezone
            <br />
            <span className="font-semibold text-foreground">
              {business.timezone}
            </span>
            <br />
            Currency{" "}
            <span className="font-semibold text-foreground">
              {business.currency}
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}
