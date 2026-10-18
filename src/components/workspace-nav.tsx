"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  LayoutDashboard,
  Sparkles,
  Users,
  Contact,
  Settings,
  ArrowUpRight,
  LogOut,
  Plus,
  ChevronDown,
  Grid2X2,
} from "lucide-react";
import { ThemeSelect } from "./theme-select";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";
const items = [
  { path: "", label: "Overview", icon: LayoutDashboard },
  { path: "appointments", label: "Appointments", icon: CalendarDays },
  { path: "services", label: "Services", icon: Sparkles },
  { path: "staff", label: "Staff", icon: Users },
  { path: "customers", label: "Customers", icon: Contact },
  { path: "modules", label: "All modules", icon: Grid2X2 },
  { path: "settings", label: "Business settings", icon: Settings },
];
export function WorkspaceNav({
  businessId,
  name,
  slug,
  businesses,
}: {
  businessId: string;
  name: string;
  slug: string;
  businesses: { id: string; name: string }[];
}) {
  const path = usePathname();
  const base = `/app/${businessId}`;
  const links = (
    <>
      <details className="mb-7 rounded-xl border border-border bg-background p-3">
        <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
          <span className="truncate">{name}</span>
          <ChevronDown size={15} />
        </summary>
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/app/${b.id}`}
              className="block rounded p-2 text-xs hover:bg-muted"
            >
              {b.name}
            </Link>
          ))}
          <Link
            href="/onboarding"
            className="flex items-center gap-2 p-2 text-xs text-primary"
          >
            <Plus size={14} />
            Add a business
          </Link>
        </div>
      </details>
      <p className="eyebrow mb-3 px-3">Workspace</p>
      <nav aria-label="Business navigation" className="space-y-1">
        {items.map((item) => {
          const href = item.path ? `${base}/${item.path}` : base;
          return (
            <Link
              key={href}
              aria-current={path === href ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted",
                path === href && "bg-accent text-primary",
              )}
              href={href}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-border pt-5">
        <div className="mb-3 px-3">
          <ThemeSelect />
        </div>
        <Link
          href={`/book/${slug}`}
          className="flex items-center justify-between rounded-lg p-3 text-sm text-muted-foreground"
        >
          Public page
          <ArrowUpRight size={16} />
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground hover:bg-muted"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </>
  );
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto flex-col border-r border-border bg-card p-5 lg:flex">
        <div className="mb-10">
          <Brand />
        </div>
        {links}
        <p className="mt-auto pt-8 text-xs text-muted-foreground">
          TrustCore Labs
        </p>
      </aside>
      <header className="border-b border-border bg-card p-4 lg:hidden">
        <Brand />
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Workspace menu
          </summary>
          <div className="pt-5">{links}</div>
        </details>
      </header>
    </>
  );
}
