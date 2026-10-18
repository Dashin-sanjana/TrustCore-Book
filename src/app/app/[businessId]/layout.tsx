import { getNavigation } from "@/server/queries";
import { WorkspaceNav } from "@/components/workspace-nav";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { business, user, member, memberships } =
    await getNavigation(businessId);
  return (
    <div className="min-h-screen lg:flex">
      <WorkspaceNav
        businessId={businessId}
        name={business.name}
        slug={business.slug}
        businesses={memberships.map((m) => ({
          id: m.business.id,
          name: m.business.name,
        }))}
      />
      <div className="min-w-0 flex-1">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-border bg-card px-5 md:px-9">
          <p className="text-sm text-muted-foreground">
            Your workspace <span className="mx-2 text-border">/</span>
            <span className="font-medium text-foreground">{business.name}</span>
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {member.role.toLowerCase()}
            </span>
            <span
              aria-label={user.name}
              className="grid size-9 place-items-center rounded-full bg-accent text-xs font-bold text-primary"
            >
              {user.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl p-5 py-8 md:p-9">
          {children}
        </main>
      </div>
    </div>
  );
}
