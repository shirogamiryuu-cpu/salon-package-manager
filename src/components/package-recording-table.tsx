import React from "react";
import { formatPurchaseId } from "@/lib/utils";

export type RecordingRow = {
  id: string;
  purchase_id?: string | null;
  package_id?: string | null;
  used_at: string;
  service: string;
  value?: number | string | null;
  staff?: (string | null | undefined)[];
  branch?: string;
};

export function formatRecordingDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

export function formatRecordingValue(val?: number | string | null): string {
  if (val === null || val === undefined || val === "") return "—";
  const num = typeof val === "number" ? val : Number(val);
  if (isNaN(num)) return String(val);
  return Math.round(num).toLocaleString();
}

export function formatRecordingStaff(staff?: (string | null | undefined)[]): string {
  if (!staff || !staff.length) return "—";
  const names = staff.filter((s): s is string => Boolean(s && s.trim()));
  return names.length ? names.join(" + ") : "—";
}

interface PackageRecordingTableProps {
  rows: RecordingRow[];
  emptyMessage?: string;
  className?: string;
  defaultBranch?: string;
  showPurchaseId?: boolean;
}

export function PackageRecordingTable({
  rows,
  emptyMessage = "No sessions recorded yet.",
  className = "",
  defaultBranch = "YGN",
  showPurchaseId = false,
}: PackageRecordingTableProps) {
  // Sort chronologically ascending so #1 is the first session
  const sorted = [...rows].sort(
    (a, b) => new Date(a.used_at).getTime() - new Date(b.used_at).getTime(),
  );

  if (sorted.length === 0) {
    return <div className="py-8 text-center text-sm text-foreground/50 italic">{emptyMessage}</div>;
  }

  return (
    <div
      className={`overflow-x-auto rounded-lg border border-foreground/15 bg-card/60 ${className}`}
    >
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/15 text-foreground/90 font-medium">
            <th className="py-3 px-4 w-12 font-semibold">#</th>
            <th className="py-3 px-4 w-28 font-semibold">Date</th>
            {showPurchaseId && <th className="py-3 px-4 w-32 font-semibold">Purchase ID</th>}
            <th className="py-3 px-4 font-semibold">Service</th>
            <th className="py-3 px-4 w-28 font-semibold">Value</th>
            <th className="py-3 px-4 font-semibold">Staff</th>
            <th className="py-3 px-4 w-24 font-semibold">Branch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10 text-foreground/90">
          {sorted.map((row, index) => {
            const purchaseId = row.purchase_id ?? row.package_id;
            return (
              <tr key={row.id} className="hover:bg-foreground/[0.03] transition-colors">
                <td className="py-3.5 px-4 font-mono text-xs text-foreground/70">{index + 1}</td>
                <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                  {formatRecordingDate(row.used_at)}
                </td>
                {showPurchaseId && (
                  <td
                    className="py-3.5 px-4 font-mono text-xs whitespace-nowrap text-primary font-medium"
                    title={purchaseId || undefined}
                  >
                    {formatPurchaseId(purchaseId)}
                  </td>
                )}
                <td className="py-3.5 px-4 font-medium">{row.service}</td>
                <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                  {formatRecordingValue(row.value)}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">{formatRecordingStaff(row.staff)}</td>
                <td className="py-3.5 px-4 font-mono text-xs uppercase tracking-wide">
                  {row.branch || defaultBranch}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
