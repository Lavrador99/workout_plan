import { getAccessories } from "@/data/accessories";
import type { PlanConfig, Session, SessionType } from "@/types";
import { getBlock, getWeek, isDeload } from "@/utils/date";
import { getSessionOverride } from "@/utils/storage";
import { buildFrontLever } from "./frontLever";
import { buildFullbody, buildGlutesLegs } from "./fullbody";
import { buildHandstand } from "./handstand";
import { buildFatLossCircuit, buildHiitCardio } from "./hiitCardio";
import { buildLegs } from "./legs";
import { buildPlanche } from "./planche";
import { buildLongRun, buildQualityRun } from "./runs";
import { buildUpper } from "./upper";

export function buildSession(
  type: SessionType,
  week: number,
  b: number,
  dl: boolean,
): Session {
  const builders: Record<SessionType, () => Session> = {
    upper: () => buildUpper(week, b, dl),
    legs: () => buildLegs(week, b, dl),
    front_lever: () => buildFrontLever(week, b, dl),
    planche: () => buildPlanche(week, b, dl),
    handstand: () => buildHandstand(week, b, dl),
    quality_run: () => buildQualityRun(week, b, dl),
    long_run: () => buildLongRun(week, b, dl),
    fullbody: () => buildFullbody(week, b, dl),
    glutes_legs: () => buildGlutesLegs(week, b, dl),
    hiit_cardio: () => buildHiitCardio(week, b, dl),
    fat_loss_circuit: () => buildFatLossCircuit(week, b, dl),
  };

  const session = builders[type]?.() ?? {
    title: "Descanso",
    exercises: [],
    accessories: [],
  };

  session.accessories = getAccessories(type, b, dl);
  return session;
}

export function getSessionForDate(
  date: Date,
  config: PlanConfig,
  profilePrefix: string,
): Session | null {
  const week = getWeek(date, config);
  if (week < 1 || week > config.weeks) return null;

  const override = getSessionOverride(
    profilePrefix,
    date,
  ) as SessionType | null;
  const type: SessionType = override ?? getScheduledTypeForDate(date, config);

  const b = getBlock(week);
  const dl = isDeload(week);
  return buildSession(type, week, b, dl);
}

export function getScheduledTypeForDate(
  date: Date,
  config: PlanConfig,
): SessionType {
  const idx = config.trainingDays.indexOf(date.getDay());
  if (idx === -1) return "upper"; // fallback, shouldn't happen
  return config.schedule[idx % config.schedule.length];
}
