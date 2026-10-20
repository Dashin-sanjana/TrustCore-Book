import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { localOutboxTarget } from "@/server/local-outbox-target";
import { LocalOutboxViewer } from "@/components/local-outbox-viewer";

export const dynamic = "force-dynamic";

export default async function Page() {
  const target = localOutboxTarget(process.env);
  if (!target || (await headers()).get("host") !== new URL(target.origin).host)
    notFound();
  return <LocalOutboxViewer />;
}
