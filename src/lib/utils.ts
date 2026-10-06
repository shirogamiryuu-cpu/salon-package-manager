import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPurchaseId(id?: string | null): string {
  if (!id) return "—";
  const clean = id.replace(/-/g, "").toUpperCase();
  return `PUR-${clean.slice(0, 8)}`;
}

export function formatPackageId(id?: string | null): string {
  return formatPurchaseId(id);
}
