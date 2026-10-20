import Link from "next/link";
import { notFound } from "next/navigation";
import { listBusinessMembersService } from "@/server/member-management";
import { a2Enabled, pendingInvitations } from "@/server/membership";
import { MemberControls } from "@/features/membership/components/member-controls";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ after?: string | string[] }>;
}) {
  const { businessId } = await params;
  const cursor = (await searchParams).after;
  if (Array.isArray(cursor)) notFound();
  const directory = await listBusinessMembersService(businessId, cursor);
  const invitations = a2Enabled() ? await pendingInvitations(businessId) : [];

  return (
    <div className="max-w-4xl">
      <p className="eyebrow mb-3">{directory.businessName}</p>
      <h1 className="text-3xl font-semibold">Members</h1>
      <div className="mt-7 overflow-x-auto border-y border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="py-3 pr-5 font-medium">
                Name
              </th>
              <th scope="col" className="py-3 pr-5 font-medium">
                Email
              </th>
              <th scope="col" className="py-3 font-medium">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {directory.members.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-muted-foreground">
                  No members found.
                </td>
              </tr>
            )}
            {directory.members.map((member) => (
              <tr key={member.id}>
                <td className="py-4 pr-5 font-medium">{member.name}</td>
                <td className="py-4 pr-5 text-muted-foreground">
                  {member.email}
                </td>
                <td className="py-4 capitalize">{member.role.toLowerCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav
        aria-label="Member pages"
        className="mt-5 flex items-center gap-5 text-sm"
      >
        {cursor && (
          <Link
            href={`/app/${businessId}/members`}
            className="text-primary hover:underline"
          >
            First page
          </Link>
        )}
        {directory.nextCursor && (
          <Link
            href={{
              pathname: `/app/${businessId}/members`,
              query: { after: directory.nextCursor },
            }}
            className="text-primary hover:underline"
          >
            Next page
          </Link>
        )}
      </nav>
      {a2Enabled() && (
        <MemberControls
          businessId={businessId}
          actorId={directory.actorId}
          actorRole={directory.actorRole}
          members={directory.members}
          invitations={invitations}
        />
      )}
    </div>
  );
}
