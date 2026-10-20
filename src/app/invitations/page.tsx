import { InvitationResponse } from "@/features/membership/components/invitation-response";

export default function Page() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-semibold">Business invitation</h1>
      <InvitationResponse />
    </main>
  );
}
