import { GRID_SIZE } from "@/lib/battleship10";

export const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;

export function rowLabel(row: number): string {
  return ROW_LABELS[row] ?? "";
}

export function colLabel(col: number): string {
  return String(col + 1);
}

export function formatCoord(row: number, col: number): string {
  return `${rowLabel(row)}${colLabel(col)}`;
}

export function parseCoord(input: string): { row: number; col: number } | null {
  const t = input.trim().toUpperCase();
  const m = /^([A-J])(10|[1-9])$/.exec(t);
  if (!m) return null;
  const row = ROW_LABELS.indexOf(m[1] as (typeof ROW_LABELS)[number]);
  const col = parseInt(m[2]!, 10) - 1;
  if (row < 0 || col < 0 || col >= GRID_SIZE) return null;
  return { row, col };
}
