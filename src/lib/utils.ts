import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function money(amount: number | string, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    Number(amount),
  );
}
export function localTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(value);
}
