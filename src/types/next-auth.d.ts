import type { DefaultSession } from "next-auth";
declare module "next-auth" {
  interface User {
    credentialVersion?: number;
  }
  interface Session {
    user: { id: string } & DefaultSession["user"];
    sessionId: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    sid?: string;
  }
}
