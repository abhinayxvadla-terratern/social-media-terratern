import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string into a URL-safe slug with lowercase letters, numbers, and hyphens.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars except hyphen
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

/**
 * Generates a unique slug by appending -2, -3, etc. if already in use.
 */
export function generateUniqueSlug(baseName: string, existingSlugs: string[]): string {
  const baseSlug = slugify(baseName) || "page";
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

/**
 * Generates a secure random 32-character hexadecimal page key.
 */
export function generatePageKey(): string {
  const chars = "abcdef0123456789";
  let result = "pk_";
  for (let i = 0; i < 30; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Formats a timestamp into a human-readable string.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Formats date only (YYYY-MM-DD).
 */
export function formatDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Formats numbers into percentages (e.g. 25.50%).
 */
export function formatPercentage(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.0%";
  return `${Number(val).toFixed(1)}%`;
}

/**
 * Formats numbers with commas.
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Triggers a browser download of an array of objects as a CSV file.
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]): void {
  if (!rows || rows.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Extract all unique headers
  const headers = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row)))
  );

  const escapeCSVValue = (val: any): string => {
    if (val === null || val === undefined) return '""';
    if (typeof val === "object") {
      return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
    }
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCSVValue(row[header])).join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
