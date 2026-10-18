import Link from "next/link";
import { ThemeSelect } from "@/components/theme-select";
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Check,
  Globe2,
  ShieldCheck,
  Users2,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 md:px-10">
        <Brand />
        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <div className="hidden md:block">
            <ThemeSelect />
          </div>
          <Link
            href="#workspace"
            className="hidden text-sm text-muted-foreground sm:block"
          >
            Your workspace
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/register">
              Get started <ArrowUpRight size={16} />
            </Link>
          </Button>
        </nav>
      </header>
      <main id="main">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="eyebrow mb-6 flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" /> Thoughtfully
              built for service businesses
            </p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] md:text-7xl">
              Good business.
              <br />A little more{" "}
              <span className="text-primary">breathing room.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">
              Bring your team, services and customers into one calm workspace.
              Make space for the work you love.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild>
                <Link href="/register">
                  Create your workspace <ArrowRight size={17} />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="#workspace">Explore the essentials</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              For salons, spas and the service teams behind them.
            </p>
          </div>
          <div className="relative rounded-[2rem] border border-border bg-accent p-5 md:p-9">
            <div className="mb-6 flex items-center justify-between">
              <span className="eyebrow">Everything in its place</span>
              <Sparkles size={20} className="text-primary" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="flex items-center gap-3 border-b border-border pb-5">
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                  <CalendarDays size={22} />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Your business, in focus
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A connected workspace for your team
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  [Users2, "Your people", "Customers & staff"],
                  [Sparkles, "Your craft", "Services & pricing"],
                ].map(([Icon, title, desc]) => {
                  const I = Icon as typeof Users2;
                  return (
                    <div
                      key={String(title)}
                      className="rounded-xl bg-background p-4"
                    >
                      <I size={20} className="mb-5 text-primary" />
                      <p className="text-sm font-semibold">{String(title)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String(desc)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-border p-4">
                <span className="grid size-8 place-items-center rounded-full bg-accent text-primary">
                  <Check size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Start with a strong foundation
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    One business. One organized place.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Workspace illustration · No sample customer data
            </p>
          </div>
        </section>
        <section id="workspace" className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-3">Less friction. More focus.</p>
                <h2 className="text-3xl font-semibold">
                  A home for the everyday.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                The essentials to organize your business today, with room to
                grow tomorrow.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                [
                  Users2,
                  "People, connected",
                  "Keep customer details and your team directory close at hand.",
                ],
                [
                  Sparkles,
                  "Services, organized",
                  "Define what you do, how long it takes and what it costs.",
                ],
                [
                  ShieldCheck,
                  "A workspace of your own",
                  "Role-based access keeps each business in its own secure space.",
                ],
              ].map(([Icon, title, desc]) => {
                const I = Icon as typeof Users2;
                return (
                  <Card key={String(title)} className="shadow-none">
                    <I className="mb-6 text-primary" size={24} />
                    <h3 className="text-lg font-semibold">{String(title)}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {String(desc)}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
        <section className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-12 md:px-10">
          <div className="flex items-center gap-3">
            <Globe2 className="text-primary" />
            <p className="text-sm text-muted-foreground">
              Built for local businesses. Ready for a wider world.
            </p>
          </div>
          <p className="text-xs font-medium tracking-wide">
            Sri Lanka · Maldives · UAE · Australia
          </p>
        </section>
      </main>
      <footer className="border-t border-border px-5 py-7 text-center text-xs text-muted-foreground">
        TrustCore Book by TrustCore Labs · Online appointment booking is in
        development.
      </footer>
    </>
  );
}
