export const AUTHOR_LINKS = {
  github: "https://github.com/hungtcs/aesl0213c-tlsr8250",
  bilibili: "https://space.bilibili.com/25043249",
} as const;

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextSaturdayStr(): string {
  const today = new Date();
  const nextSat = new Date(today);
  const diff = (6 - today.getDay() + 7) % 7 || 7;
  nextSat.setDate(today.getDate() + diff);
  return `${nextSat.getFullYear()}-${String(nextSat.getMonth() + 1).padStart(2, "0")}-${String(nextSat.getDate()).padStart(2, "0")}`;
}

export function accentColor(theme: unknown): string {
  return theme === "black" || theme === "blackTop" ? "#000000" : "#FF0000";
}

export function strVal(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
