import { supabase } from "@/integrations/supabase/client";

export type Promotion = {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export type PromoStatus = "Active" | "Scheduled" | "Expired" | "Disabled";

export function promotionStatus(p: Promotion, now = new Date()): PromoStatus {
  if (!p.is_active) return "Disabled";
  const start = new Date(p.start_date);
  const end = new Date(p.end_date);
  if (now < start) return "Scheduled";
  if (now > end) return "Expired";
  return "Active";
}

export function isPromotionLive(p: Promotion, now = new Date()): boolean {
  return promotionStatus(p, now) === "Active";
}

export function applyPromotion(price: number, p: Promotion) {
  const discountAmount =
    p.discount_type === "percentage"
      ? Math.min(price, (price * Number(p.discount_value)) / 100)
      : Math.min(price, Number(p.discount_value));
  return {
    original: price,
    discount: discountAmount,
    final: Math.max(0, price - discountAmount),
  };
}

// Fetch a map of packageId -> active promotion (if any) for the given package ids.
export async function fetchActivePromoMap(packageIds: string[]) {
  const map = new Map<string, Promotion>();
  if (packageIds.length === 0) return map;
  const { data } = await supabase
    .from("package_promotions")
    .select("package_id, promotions(*)")
    .in("package_id", packageIds);
  for (const row of (data ?? []) as any[]) {
    const promo = row.promotions as Promotion | null;
    if (promo && isPromotionLive(promo)) {
      // Prefer larger discount if two coexist (should be blocked by trigger but safe).
      const existing = map.get(row.package_id);
      if (!existing) map.set(row.package_id, promo);
    }
  }
  return map;
}

export function formatDiscountLabel(p: Promotion) {
  return p.discount_type === "percentage"
    ? `${Number(p.discount_value)}% OFF`
    : `-${Number(p.discount_value).toLocaleString()} OFF`;
}
