import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as MMK with no decimals (MMK has no fractional units). */
export function mmk(amount: number | null | undefined): string {
  return `MMK ${Math.round(Number(amount ?? 0)).toLocaleString("en-US")}`;
}

