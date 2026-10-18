export const dynamic = "force-dynamic";
import { requireUser } from "@/server/authorization";
import { Brand } from "@/components/brand";
import { BusinessForm } from "@/components/business-form";
export default async function Page() {
  await requireUser();
  return (
    <>
      <header className="p-6">
        <Brand />
      </header>
      <main id="main" className="mx-auto max-w-2xl px-5 py-12">
        <p className="eyebrow mb-4">Make it yours</p>
        <h1 className="text-3xl font-semibold">
          Welcome to your next chapter.
        </h1>
        <p className="mb-8 mt-3 text-muted-foreground">
          Tell us a little about your business. You can update these details
          later.
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-9">
          <BusinessForm />
        </div>
      </main>
    </>
  );
}
