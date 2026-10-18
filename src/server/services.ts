import "server-only";
import { hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { createCredentialsUser } from "./repositories/identity";
import {
  createOwnedBusiness,
  insertRecord,
  updateProfile,
} from "./repositories/workspace";
import {
  businessSchema,
  customerSchema,
  registerSchema,
  serviceSchema,
  staffSchema,
} from "@/lib/validation";
import { requireTenant, requireUser } from "./authorization";
import { rateLimit } from "./rate-limit";
export type ActionResult = { error?: string; success?: string };
export async function registerAccountService(
  input: unknown,
): Promise<ActionResult> {
  const result = registerSchema.safeParse(input);
  if (!result.success)
    return { error: result.error.issues[0]?.message ?? "Check your details." };
  try {
    await rateLimit("registration:global", 100);
    await rateLimit(`register:${result.data.email}`, 5);
    const passwordHash = await hash(result.data.password, 12);
    await createCredentialsUser({
      name: result.data.name,
      email: result.data.email,
      passwordHash,
    });
    return { success: "Account created. You can now sign in." };
  } catch {
    return {
      error:
        "Unable to create this account. Try signing in or try again later.",
    };
  }
}
export async function createBusinessService(
  input: unknown,
): Promise<ActionResult & { businessId?: string }> {
  const user = await requireUser();
  const result = businessSchema.safeParse(input);
  if (!result.success)
    return { error: result.error.issues[0]?.message ?? "Check your details." };
  let id: string;
  try {
    await rateLimit(`onboard:${user.id}`, 5);
    const business = await createOwnedBusiness(user.id, result.data);
    id = business.id;
  } catch {
    return {
      error:
        "Unable to create this business. The booking address may already be taken.",
    };
  }
  return { businessId: id };
}
export async function createRecordService(
  businessId: string,
  kind: "services" | "staff" | "customers",
  input: unknown,
): Promise<ActionResult> {
  const { user, context } = await requireTenant(businessId, true);
  const schema =
    kind === "services"
      ? serviceSchema
      : kind === "staff"
        ? staffSchema
        : kind === "customers"
          ? customerSchema
          : null;
  if (!schema) return { error: "Unknown record type." };
  const result = schema.safeParse(input);
  if (!result.success)
    return { error: result.error.issues[0]?.message ?? "Check your details." };
  try {
    await rateLimit(`write:${user.id}`, 60, 60);
    if (kind === "services")
      await insertRecord(context, { kind, input: serviceSchema.parse(input) });
    else if (kind === "staff")
      await insertRecord(context, { kind, input: staffSchema.parse(input) });
    else
      await insertRecord(context, { kind, input: customerSchema.parse(input) });
  } catch {
    return { error: "Unable to save. Please try again." };
  }
  return { success: "Saved successfully." };
}
export async function updateBusinessService(
  businessId: string,
  input: unknown,
): Promise<ActionResult> {
  const { user, business, context } = await requireTenant(businessId, true);
  const result = businessSchema.safeParse(input);
  if (!result.success)
    return { error: result.error.issues[0]?.message ?? "Check your details." };
  // Currency changes need a future explicit migration flow once prices exist.
  if (result.data.country !== business.country)
    return { error: "Contact support to change your business country." };
  try {
    await rateLimit(`settings:${user.id}`, 20, 60);
    await updateProfile(context, result.data);
  } catch (error) {
    return {
      error:
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
          ? "That booking address is already in use."
          : "Unable to save settings.",
    };
  }
  return { success: "Business settings updated." };
}
