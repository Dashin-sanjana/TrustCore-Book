import { AccountFlowForm } from "@/components/account-flow-form";
import { Brand } from "@/components/brand";

export default function Page() {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-6 py-10">
      <Brand />
      <h1 className="text-3xl font-semibold">Password recovery</h1>
      <AccountFlowForm mode="forgot" />
    </main>
  );
}
