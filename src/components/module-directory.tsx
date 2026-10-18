import Link from "next/link";
import { modules, moduleHref } from "@/features/registry";
import { Card } from "./ui/card";
export function ModuleDirectory({
  businessId,
  platformAdmin = false,
}: {
  businessId: string;
  platformAdmin?: boolean;
}) {
  return (
    <>
      <p className="eyebrow mb-3">Your workspace</p>
      <h1 className="text-3xl font-semibold">All modules</h1>
      <p className="my-5 text-sm text-muted-foreground">
        Explore your workspace. Planned workflows are clearly marked.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules
          .filter((m) => platformAdmin || m.id !== "platform-admin")
          .map((module) => (
            <Link key={module.id} href={moduleHref(module, businessId)}>
              <Card className="h-full hover:border-primary">
                <span className="text-xs font-semibold text-primary">
                  {module.status === "scaffold"
                    ? "Not implemented"
                    : "Foundation available"}
                </span>
                <h2 className="mb-3 mt-2 text-lg font-semibold">
                  {module.title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {module.summary}
                </p>
              </Card>
            </Link>
          ))}
      </div>
    </>
  );
}
