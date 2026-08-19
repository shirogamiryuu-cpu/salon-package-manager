import { jsPDF } from "jspdf";

export type LoginSheetData = {
  name?: string;
  phone: string;
  password: string;
  siteUrl?: string;
};

const GOLD: [number, number, number] = [183, 154, 92];
const TEXT: [number, number, number] = [34, 34, 34];
const MUTED: [number, number, number] = [120, 116, 110];

export function generateLoginSheetPdf(data: LoginSheetData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 56;
  let y = 92;

  doc.setTextColor(...GOLD);
  doc.setFont("times", "normal");
  doc.setFontSize(26);
  doc.text("CHARME", W / 2, y, { align: "center" });

  y += 20;
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("CUSTOMER LOGIN SHEET", W / 2, y, { align: "center" });

  y += 26;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);

  y += 46;
  doc.setTextColor(...TEXT);
  doc.setFontSize(12);
  doc.text(
    "Welcome! Use the details below to sign in to your account.",
    M,
    y,
  );

  y += 34;
  const boxTop = y;
  const rows: Array<[string, string]> = [];
  if (data.name?.trim()) rows.push(["Name", data.name.trim()]);
  rows.push(["Username (phone)", data.phone]);
  rows.push(["Temporary password", data.password]);
  if (data.siteUrl) rows.push(["Sign in at", data.siteUrl]);

  const rowH = 34;
  const boxH = rows.length * rowH + 24;
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(1);
  doc.rect(M, boxTop, W - M * 2, boxH);

  let ry = boxTop + 34;
  rows.forEach(([label, value]) => {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), M + 20, ry);
    doc.setFontSize(14);
    doc.setTextColor(...TEXT);
    doc.text(String(value), W - M - 20, ry, { align: "right" });
    ry += rowH;
  });

  y = boxTop + boxH + 46;
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  const notes = [
    "1. Open the app and choose Sign in.",
    "2. Enter your phone number as the username.",
    "3. Enter the temporary password exactly as shown above.",
    "4. Please change your password after your first sign in.",
  ];
  notes.forEach((line) => {
    doc.text(line, M, y);
    y += 20;
  });

  y += 18;
  doc.setFontSize(9);
  doc.text(
    `Issued ${new Date().toLocaleDateString()} — keep this sheet private.`,
    M,
    y,
  );

  const safePhone = data.phone.replace(/[^\w]+/g, "");
  doc.save(`charme-login-${safePhone || "customer"}.pdf`);
}
