export const dynamic = "force-dynamic";
import { requireUser } from "@/server/authorization";
import { Brand } from "@/components/brand";
import { BusinessForm } from "@/components/business-form";
import { AccountMenu } from "@/components/account-menu";
export default async function Page() {
  const user = await requireUser();
  return (
    <>
      <header className="flex items-center justify-between gap-4 px-5 py-6 md:px-9">
        <Brand />
        <AccountMenu name={user.name} email={user.email} />
      </header>
      <main id="main" className="mx-auto max-w-2xl px-5 py-12">
        <p className="eyebrow mb-4">Business setup</p>
        <h1 className="text-3xl font-semibold">Set up your business</h1>
        <p className="mb-8 mt-3 text-muted-foreground">
          Add a few details to create your workspace. You can change them later.
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-9">
          <BusinessForm />
        </div>
      </main>
    </>
  );
}
