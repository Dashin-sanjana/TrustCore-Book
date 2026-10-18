import "server-only";
import { db } from "@/lib/db";
import type { TenantContext } from "@/server/authorization";
import type { z } from "zod";
import type {
  businessSchema,
  serviceSchema,
  staffSchema,
  customerSchema,
} from "@/lib/validation";
import { markets } from "@/lib/validation";
type BusinessInput = z.infer<typeof businessSchema>;
export function createOwnedBusiness(actorId: string, input: BusinessInput) {
  return db().$transaction(async (tx) => {
    const b = await tx.business.create({
      data: {
        ...input,
        currency: markets[input.country].currency,
        members: { create: { userId: actorId, role: "OWNER" } },
      },
    });
    await tx.auditLog.create({
      data: {
        businessId: b.id,
        actorId,
        action: "business.created",
        entityId: b.id,
      },
    });
    return b;
  });
}
export function readWorkspace(scope: TenantContext) {
  const businessId = scope.businessId;
  return Promise.all([
    db().service.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    db().staff.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    db().customer.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db().appointment.findMany({
      where: { businessId },
      include: { customer: true, staff: true, service: true },
      orderBy: { startsAt: "desc" },
      take: 100,
    }),
  ]);
}
export function readDashboardCounts(scope: TenantContext) {
  const businessId = scope.businessId;
  return Promise.all([
    db().appointment.count({ where: { businessId } }),
    db().service.count({ where: { businessId, active: true } }),
    db().staff.count({ where: { businessId, active: true } }),
    db().customer.count({ where: { businessId } }),
  ]);
}
type NewRecord =
  | { kind: "services"; input: z.infer<typeof serviceSchema> }
  | { kind: "staff"; input: z.infer<typeof staffSchema> }
  | { kind: "customers"; input: z.infer<typeof customerSchema> };
export function insertRecord(scope: TenantContext, record: NewRecord) {
  return db().$transaction(async (tx) => {
    const businessId = scope.businessId;
    let entity: { id: string };
    switch (record.kind) {
      case "services":
        entity = await tx.service.create({
          data: { ...record.input, businessId },
        });
        break;
      case "staff":
        entity = await tx.staff.create({
          data: { ...record.input, businessId },
        });
        break;
      case "customers":
        entity = await tx.customer.create({
          data: {
            ...record.input,
            businessId,
            email: record.input.email || null,
            phone: record.input.phone || null,
          },
        });
        break;
    }
    await tx.auditLog.create({
      data: {
        businessId,
        actorId: scope.actorId,
        action: `${record.kind}.created`,
        entityId: entity.id,
      },
    });
  });
}
export function updateProfile(scope: TenantContext, input: BusinessInput) {
  return db().$transaction(async (tx) => {
    await tx.business.update({ where: { id: scope.businessId }, data: input });
    await tx.auditLog.create({
      data: {
        businessId: scope.businessId,
        actorId: scope.actorId,
        action: "business.updated",
        entityId: scope.businessId,
      },
    });
  });
}
