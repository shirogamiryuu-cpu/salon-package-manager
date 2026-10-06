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

export function normalizeMyanmarPhone(input?: string | null): string {
  if (!input) return "";
  let p = input.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
  if (p.startsWith("+95")) {
    p = "0" + p.slice(3);
  } else if (p.startsWith("95") && p.length > 8) {
    p = "0" + p.slice(2);
  } else if (p.startsWith("9") && !p.startsWith("09")) {
    p = "0" + p;
  }
  return p;
}
