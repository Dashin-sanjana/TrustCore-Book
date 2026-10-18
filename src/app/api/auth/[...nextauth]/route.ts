import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/server/rate-limit";
async function handler(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  if (request.method === "POST") {
    try {
      await rateLimit("auth-post:global", 200, 60);
    } catch {
      return Response.json(
        { error: "Authentication temporarily unavailable. Try again later." },
        { status: 429 },
      );
    }
  }
  const params = await context.params;
  return NextAuth(authOptions())(request, { ...context, params });
}
export { handler as GET, handler as POST };
