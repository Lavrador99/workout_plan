import type { PlanConfig } from "@/types";

export function dateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getWeek(date: Date, config: PlanConfig): number {
  const start = new Date(config.startDate);
  start.setHours(0, 0, 0, 0);
  const ms = date.getTime() - start.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function getBlock(week: number): number {
  return Math.min(4, Math.ceil(week / 4));
}

export function isDeload(week: number): boolean {
  return week % 4 === 0;
}

export function isLegsForce(week: number): boolean {
  return week % 2 === 1;
}

export function wavePct(week: number): string {
  const w = ((week - 1) % 4) + 1;
  return ["85%", "88%", "92%", "70% DELOAD"][w - 1];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Return Monday of the week containing `date` */
export function getWeekMonday(date: Date): Date {
  const mon = new Date(date);
  mon.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  return mon;
}
