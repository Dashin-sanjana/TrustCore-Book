/** Transport-independent contexts; services derive these on the server. Never accept them from browser JSON. */
export type UserServiceContext = { readonly actorId: string };
export type PublicServiceContext = { readonly requestId: string };
export type PlatformAdminContext = UserServiceContext & {
  readonly platformAdmin: true;
};
