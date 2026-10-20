import "server-only";

export type BookingNotification = {
  businessId: string;
  bookingId: string;
  recipient: string;
  kind: "BOOKING_CONFIRMED" | "BOOKING_CANCELLED";
};

export type NotificationResult =
  { delivered: true } | { delivered: false; reason: "unconfigured" | "failed" };

export interface BookingNotificationProvider {
  readonly configured: boolean;
  send(message: BookingNotification): Promise<NotificationResult>;
}

export const unavailableBookingNotifications: BookingNotificationProvider = {
  configured: false,
  async send() {
    return { delivered: false, reason: "unconfigured" };
  },
};
