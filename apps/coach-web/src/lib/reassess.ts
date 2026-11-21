import { repeatResults } from "./assessment";
import { db, newAssessment, newScreening, save } from "./db";
import { activeModules, MODULES } from "./modules";
import { nextScreening } from "./screening";
import { uid } from "@treino/core/text";
import type { Assessment, TestDef } from "@treino/core/types";

/** The same kind of assessment again, its tests empty: a module's stays the module's, the intake's stays the intake's. */
export function repeatAssessment(last: Assessment, tests: TestDef[], date?: string): Assessment {
  return {
    ...newAssessment(last.clientId),
    ...(date ? { date } : {}),
    title: last.title,
    results: repeatResults(last.results, tests),
    ...(last.moduleId ? { moduleId: last.moduleId } : {}),
    ...(last.moduleData?.intake === true ? { moduleData: { intake: true } } : {}),
  };
}

const newest = <T extends { date: string; updatedAt: number; deleted?: boolean }>(list: T[]) =>
  list.filter((x) => !x.deleted).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)[0];

/**
 * A reassessment makes new records and leaves the old ones as they were: a new
 * intake from the last one (same answers, no decision), a new general
 * assessment and one per active module, with the same tests, empty. What is
 * already dated today is used as it is, so starting twice adds nothing.
 */
export async function startReassessment(clientId: string, today: string, tests: TestDef[]): Promise<void> {
  const client = await db.clients.get(clientId);
  if (!client) return;
  const screenings = await db.screenings.where("clientId").equals(clientId).toArray();
  const assessments = await db.assessments.where("clientId").equals(clientId).toArray();
  const lastScreening = newest(screenings);
  if (lastScreening?.date !== today) await save("screenings", lastScreening ? nextScreening(lastScreening, uid(), today) : { ...newScreening(clientId), date: today });
  const lastIntake = newest(assessments.filter((a) => a.moduleData?.intake === true));
  if (lastIntake && lastIntake.date !== today) await save("assessments", repeatAssessment(lastIntake, tests, today));
  for (const m of activeModules(client, lastScreening, today).filter((x) => MODULES[x])) {
    const last = newest(assessments.filter((a) => a.moduleId === m));
    if (last && last.date !== today) await save("assessments", repeatAssessment(last, tests, today));
  }
}
