export type ModuleDefinition = {
  id: string;
  title: string;
  owner: "A" | "B" | "Shared";
  priority: "MVP" | "Later";
  status: "foundation" | "scaffold";
  route: string;
  summary: string;
  dependencies: string;
  acceptance: string;
};
export const modules = [
  {
    id: "authentication",
    title: "Authentication",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "/login",
    summary:
      "Sign in securely and access your account. Account recovery and email verification are planned.",
    dependencies: "users-sessions,security",
    acceptance:
      "Authenticated user or generic rejection; no credential disclosure.",
  },
  {
    id: "users-sessions",
    title: "User and session management",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "users-sessions",
    summary:
      "Manage your account and signed-in devices. These controls are planned.",
    dependencies: "authentication",
    acceptance:
      "Only the account owner can inspect or revoke sessions; expiry enforced server-side.",
  },
  {
    id: "business-onboarding",
    title: "Business onboarding",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "/onboarding",
    summary: "Create your business workspace and set its essential details.",
    dependencies: "authentication,businesses,permissions",
    acceptance: "Business, owner membership and audit event commit atomically.",
  },
  {
    id: "businesses",
    title: "Business management",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "businesses",
    summary:
      "Switch between your businesses. Additional business management tools are planned.",
    dependencies: "authentication,permissions",
    acceptance: "A user can access only businesses with current membership.",
  },
  {
    id: "permissions",
    title: "Role-based permissions",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "permissions",
    summary:
      "Control who can access your workspace. Team invitation and role management screens are planned.",
    dependencies: "authentication,users-sessions",
    acceptance: "Member writes and cross-tenant reads are denied server-side.",
  },
  {
    id: "services",
    title: "Services and categories",
    owner: "B",
    priority: "MVP",
    status: "foundation",
    route: "services",
    summary:
      "Organize services, durations and prices. Categories and editing are planned.",
    dependencies: "businesses,permissions",
    acceptance:
      "Managers maintain tenant services; duration and money validate; categories remain explicit stubs.",
  },
  {
    id: "staff",
    title: "Staff management",
    owner: "B",
    priority: "MVP",
    status: "foundation",
    route: "staff",
    summary:
      "Keep your team directory together. Service assignments and profile editing are planned.",
    dependencies: "businesses,services",
    acceptance:
      "Staff belongs to the current tenant; assignments cannot cross tenants.",
  },
  {
    id: "availability",
    title: "Working hours and availability",
    owner: "B",
    priority: "MVP",
    status: "scaffold",
    route: "availability",
    summary:
      "Set working hours, days off and schedule exceptions. This workflow is planned.",
    dependencies: "staff,localization",
    acceptance:
      "Rules validate local weekday/minutes; exception intervals are positive UTC instants.",
  },
  {
    id: "customers",
    title: "Customer management",
    owner: "B",
    priority: "MVP",
    status: "foundation",
    route: "customers",
    summary:
      "Keep a customer directory for your business. Editing and retention tools are planned.",
    dependencies: "businesses,permissions",
    acceptance:
      "Customer data is visible only to current tenant members; writes require a manager.",
  },
  {
    id: "appointments",
    title: "Appointment management",
    owner: "B",
    priority: "MVP",
    status: "foundation",
    route: "appointments",
    summary:
      "Review recorded appointments. Creating, changing and cancelling appointments is planned.",
    dependencies: "booking-engine,customers,staff,services",
    acceptance:
      "All transitions validate tenant ownership and write an audit event; no fake booking success.",
  },
  {
    id: "booking-engine",
    title: "Booking availability engine",
    owner: "Shared",
    priority: "MVP",
    status: "scaffold",
    route: "booking-engine",
    summary:
      "Find appointment times that fit your services and team. Online availability is planned.",
    dependencies: "availability,staff,services,localization",
    acceptance:
      "Reviewed DST rules, idempotency and concurrent conflict tests precede implementation.",
  },
  {
    id: "public-booking",
    title: "Public booking portal",
    owner: "B",
    priority: "MVP",
    status: "foundation",
    route: "public-booking",
    summary:
      "Share your public service menu. Online appointment scheduling is planned.",
    dependencies: "booking-engine,security",
    acceptance:
      "Only explicit public DTO fields are returned; no customer or internal staff identifiers.",
  },
  {
    id: "notifications",
    title: "Notifications and reminders",
    owner: "B",
    priority: "MVP",
    status: "scaffold",
    route: "notifications",
    summary:
      "Send appointment confirmations and reminders. Delivery is not available yet.",
    dependencies: "appointments,localization",
    acceptance:
      "Provider configured explicitly; retries deduplicate; secrets and customer details are redacted.",
  },
  {
    id: "dashboard",
    title: "Business dashboard",
    owner: "B",
    priority: "MVP",
    status: "foundation",
    route: "",
    summary: "View your business counts and workspace setup checklist.",
    dependencies: "services,staff,customers,appointments",
    acceptance:
      "Counts are tenant-filtered database values, never fabricated metrics.",
  },
  {
    id: "analytics",
    title: "Analytics and reports",
    owner: "B",
    priority: "Later",
    status: "scaffold",
    route: "analytics",
    summary: "Explore business activity and reports. Reporting is planned.",
    dependencies: "appointments,dashboard",
    acceptance:
      "Date ranges have defined business timezone boundaries; tenant reports cannot leak data.",
  },
  {
    id: "billing",
    title: "Subscription plans and billing",
    owner: "A",
    priority: "Later",
    status: "scaffold",
    route: "billing",
    summary: "Manage your subscription and invoices. Billing is planned.",
    dependencies: "businesses,payments",
    acceptance:
      "Verified webhook events drive state; replay-safe entitlements enforce plan rules server-side.",
  },
  {
    id: "payments",
    title: "Payment integrations",
    owner: "A",
    priority: "Later",
    status: "scaffold",
    route: "payments",
    summary:
      "Accept payments through a connected provider. Payment collection is planned.",
    dependencies: "billing,security",
    acceptance:
      "Amounts and currency are server-owned; signed webhooks are idempotent; no raw card data.",
  },
  {
    id: "platform-admin",
    title: "Platform super admin",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "/admin",
    summary:
      "Review the platform’s business overview. Additional administration tools are planned.",
    dependencies: "authentication,permissions,audit",
    acceptance:
      "Platform permission is verified server-side; no implicit tenant write bypass.",
  },
  {
    id: "business-settings",
    title: "Business settings",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "settings",
    summary:
      "Update your business profile, public address and timezone. More settings are planned.",
    dependencies: "businesses,permissions,localization",
    acceptance:
      "Only managers update validated settings; currency/country migration is an explicit workflow.",
  },
  {
    id: "localization",
    title: "Localization and timezones",
    owner: "Shared",
    priority: "MVP",
    status: "foundation",
    route: "localization",
    summary:
      "Use your business’s local timezone and currency. Additional languages are planned.",
    dependencies: "businesses",
    acceptance:
      "UTC persistence and IANA rendering are separate; DST gaps/folds require explicit policy.",
  },
  {
    id: "audit",
    title: "Audit logs",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "audit",
    summary:
      "Review changes made in your workspace. The activity viewer is planned.",
    dependencies: "businesses,permissions",
    acceptance:
      "Tenant-scoped immutable events omit credentials and sensitive payloads.",
  },
  {
    id: "security",
    title: "Security and monitoring",
    owner: "A",
    priority: "MVP",
    status: "foundation",
    route: "security",
    summary:
      "Manage workspace security and review service health. Monitoring controls are planned.",
    dependencies: "authentication,permissions,audit",
    acceptance:
      "Health errors are redacted, distributed limits fail closed and private secrets never reach clients.",
  },
] as const satisfies readonly ModuleDefinition[];
export function moduleHref(module: ModuleDefinition, businessId: string) {
  return module.route.startsWith("/")
    ? module.route
    : `/app/${businessId}${module.route ? `/${module.route}` : ""}`;
}
