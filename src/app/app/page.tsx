import { redirect } from "next/navigation";
import { getDefaultBusiness } from "@/server/queries";
export default async function Page() {
  const businessId = await getDefaultBusiness();
  redirect(businessId ? `/app/${businessId}` : "/onboarding");
}
