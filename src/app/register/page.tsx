import Link from "next/link";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return (
    <div className="min-h-screen">
      <header className="p-6 md:p-10">
        <Brand />
      </header>
      <main
        id="main"
        className="mx-auto grid max-w-5xl gap-12 px-6 py-10 lg:grid-cols-2 lg:py-20"
      >
        <div className="lg:pr-16">
          <p className="eyebrow mb-5">Your business starts here</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Make room for good work.
          </h1>
          <p className="mt-5 leading-7 text-muted-foreground">
            Create your account, then set up your business.
          </p>
          <div className="mt-10 rounded-2xl bg-accent p-6 text-sm leading-7">
            One workspace for your team, services and customers.
            <br />
            Built by TrustCore Labs.
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-9">
          <h2 className="mb-7 text-xl font-semibold">Create your account</h2>
          <AuthForm mode="register" />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
