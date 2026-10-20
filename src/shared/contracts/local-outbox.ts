export type AccountEmailKind = "VERIFY_EMAIL" | "RESET_PASSWORD" | "INVITATION";

export type AccountEmailMessage = {
  kind: AccountEmailKind;
  recipient: string;
  link: string;
};

export type LocalOutboxEntry = AccountEmailMessage & {
  id: string;
  createdAt: string;
  expiresAt: string;
};
