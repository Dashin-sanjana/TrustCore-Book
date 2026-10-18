"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  registerAccountService,
  createBusinessService,
  createRecordService,
  updateBusinessService,
} from "./services";
import type { ActionResult } from "./services";
export type { ActionResult } from "./services";
export async function register(input: unknown): Promise<ActionResult> {
  return registerAccountService(input);
}
export async function onboard(input: unknown): Promise<ActionResult> {
  const result = await createBusinessService(input);
  if (result.businessId) redirect(`/app/${result.businessId}`);
  return result;
}
export async function createRecord(
  businessId: string,
  kind: "services" | "staff" | "customers",
  input: unknown,
): Promise<ActionResult> {
  const result = await createRecordService(businessId, kind, input);
  if (result.success) revalidatePath(`/app/${businessId}`, "layout");
  return result;
}
export async function updateBusiness(
  businessId: string,
  input: unknown,
): Promise<ActionResult> {
  const result = await updateBusinessService(businessId, input);
  if (result.success) revalidatePath(`/app/${businessId}`, "layout");
  return result;
}
