// ─────────────────────────────────────────────────────────────────────────────
// Quick-entry parser: turns the shorthand a coach already writes
// ("Step up - 3x8 2x8kg (E +1)") into structured items and blocks.
// Anything it cannot read is kept in the item's note, never dropped.
// ─────────────────────────────────────────────────────────────────────────────

import type { Block, Item, LoadMode, RepsUnit, SetRow } from "@treino/core/types";
import { num, uid } from "@treino/core/text";

const NUM = String.raw`\d+(?:[.,]\d+)?`;

export interface ParsedSession {
  date: string | null; // YYYY-MM-DD
  title: string;
  blocks: Block[];
}

// ── Line cleanup ────────────────────────────────────────────────────────────

function clean(line: string): string {
  return line
    .replace(/\*\*/g, "")
    .replace(/^\s*\[(.*)\]\s*$/, "$1")
    .replace(/[”″“]/g, '"')
    .replace(/[×]/g, "x")
    .replace(/(\d)\s*[x*]\s*(\d)/gi, "$1x$2")
    .replace(/(^|\s)[x*]\s+(\d)/gi, "$1x$2")
    .replace(/(kg)\s*\*\s*(\d)/gi, "$1 x$2")
    .replace(/\+\s+(\d)/g, "+$1")
    .replace(/(\d)\s+(passos|seg|sec|min|kg)\b/gi, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Single exercise line ────────────────────────────────────────────────────

export function emptyItem(name: string): Item {
  return { id: uid(), name, role: "main", repsUnit: "r", loadMode: "abs", note: "", sets: [] };
}

/** One typed line as items: "(Russian twist, side bends)" gives fillers. */
export function itemsFromLine(text: string): Item[] {
  const paren = text.trim().match(/^\((.*)\)$/);
  if (!paren) return [parseItemLine(text)];
  return paren[1]
    .split(/\s*[,;]\s*/)
    .filter(Boolean)
    .map((t) => ({ ...parseItemLine(t), role: "filler" as const }));
}

/** Is this token the start of the prescription (not part of the name)? */
function isRxToken(t: string): boolean {
  return /^[x+]?\d/i.test(t);
}

/**
 * "D +1" that older versions left in an item's note (they only read "E +1") →
 * the item's extra sets. Null when there is nothing to move.
 */
export function sidesFromNote(item: Item): Item | null {
  if (!item.note) return null;
  const out = { ...item };
  const note = item.note.replace(/\(?\b([ED])\s*\+\s*(\d+)\)?/g, (m, side: string, n: string) => {
    const key = side === "E" ? "extraLeft" : "extraRight";
    if (out[key]) return m;
    out[key] = Number(n);
    return " ";
  });
  if (note === item.note) return null;
  out.note = note.replace(/\s+/g, " ").trim();
  return out;
}

export function parseItemLine(raw: string): Item {
  let line = clean(raw);
  const notes: string[] = [];
  let extraLeft = 0;
  let extraRight = 0;
  let rmTest: number | null = null;

  // E +1 / D +1 → extra sets on the left / right side
  line = line.replace(/\(?\b([ED])\s*\+\s*(\d+)\)?/g, (_, side, n) => {
    if (side === "E") extraLeft = Number(n);
    else extraRight = Number(n);
    return " ";
  });
  // 8RM: ___ → rep-max test
  line = line.replace(/\b(\d+)\s*RM\b[:\s_]*/gi, (_, n) => {
    rmTest = Number(n);
    return " ";
  });
  // tempo 3-1-1-0 / tempo 3110 / cadência 30X0 → cadence
  let tempo: string | undefined;
  line = line.replace(/\b(?:tempo|cad[eê]ncia|cad)\s*:?\s*([0-9x])[-.]?([0-9x])[-.]?([0-9x])[-.]?([0-9x])\b/gi, (_, a, b, c, d) => {
    tempo = [a, b, c, d].join("-").toUpperCase();
    return " ";
  });
  // RIR 2 / RPE 8 / @8 → effort on every set
  let effort: { kind: "rir" | "rpe"; v: number } | undefined;
  line = line.replace(new RegExp(`\\b(RIR|RPE)\\s*:?\\s*(${NUM})|(?:^|\\s)@\\s*(${NUM})\\b`, "gi"), (_, k, v, at) => {
    effort = k?.toLowerCase() === "rir" ? { kind: "rir", v: num(v)! } : { kind: "rpe", v: num(v ?? at)! };
    return " ";
  });
  // desc 90s / descanso 2min / desc. 1:30 / rest 60 → rest after every set
  let restSec: number | undefined;
  line = line.replace(/\b(?:desc(?:anso)?|rest)\.?\s*:?\s*(?:(\d+):(\d{2})|(\d+)\s*(s|seg|min)?)\b/gi, (_, m, ss, n, u) => {
    restSec = m != null ? Number(m) * 60 + Number(ss) : Number(n) * (u?.toLowerCase() === "min" ? 60 : 1);
    return " ";
  });
  // (4-5s) and other parentheticals with numbers are notes; "(bench)" stays in the name
  line = line.replace(/\(([^)]*\d[^)]*)\)/g, (_, inner) => {
    notes.push(inner.trim());
    return " ";
  });
  // " - " between name and prescription
  line = line.replace(/([^\d\s])\s*[-–—]\s+|\s+[-–—]\s+/g, "$1 ").replace(/\s*[-–—]\s*$/, "");
  line = line.replace(/\s+/g, " ").trim();

  const tokens = line.split(" ").filter(Boolean);
  let split = tokens.findIndex((t, i) => i > 0 && isRxToken(t));
  if (split < 0) split = tokens.length;
  const name = tokens.slice(0, split).join(" ").trim();
  const rest = tokens.slice(split).join(" ");

  const item = emptyItem(name);
  item.extraLeft = extraLeft || undefined;
  item.extraRight = extraRight || undefined;
  item.rmTest = rmTest;
  if (tempo) item.tempo = tempo;

  if (rest) parseRx(rest, item, notes);
  const e = effort as { kind: "rir" | "rpe"; v: number } | undefined;
  if (e) item.effort = e.kind;
  if (e || restSec != null) item.sets = item.sets.map((x) => ({ ...x, ...(e ? { rir: e.v } : {}), ...(restSec != null ? { rest: restSec } : {}) }));
  item.note = notes.filter(Boolean).join(" ");
  return item;
}

function parseRx(rx: string, item: Item, notes: string[]) {
  if (parsePerSet(rx, item)) return;

  let sets: number | null = null;
  let reps: number | null = null;
  let duration: number | null = null;
  let load: number | null = null;
  const isIso = /\biso\b/i.test(item.name);
  const tokens = rx.split(" ");
  const hasSetsXReps = tokens.some((t) => /^\d+x\d+(?:-\d+)?(?:r|s|seg|sec|min|passos|m)?$/i.test(t));

  const setUnit = (u: string | undefined, a: number, b: number | null) => {
    const unit = (u ?? "r").toLowerCase();
    if (unit === "s" || unit === "seg" || unit === "sec") {
      duration = a;
      item.durationMax = b;
    } else if (unit === "min") {
      duration = a * 60;
      item.durationMax = b != null ? b * 60 : null;
    } else {
      reps = a;
      item.repsMax = b;
      item.repsUnit = (unit === "passos" ? "passos" : unit === "m" ? "m" : "r") as RepsUnit;
    }
  };

  for (const t of tokens) {
    let m: RegExpMatchArray | null;
    // 2x8kg (dual) or 12x20kg (reps x load)
    if ((m = t.match(new RegExp(`^(\\d+)x(${NUM})(?:-(${NUM}))?kg$`, "i")))) {
      if (load == null && (hasSetsXReps || sets != null) && m[1] === "2") {
        load = num(m[2]);
        item.loadMax = num(m[3]);
        item.loadMode = "dual";
      } else if (reps == null && load == null) {
        reps = Number(m[1]);
        load = num(m[2]);
        item.loadMax = num(m[3]);
      } else notes.push(t);
    }
    // 3x8, 2x20-25s, 2x15passos
    else if ((m = t.match(/^(\d+)x(\d+)(?:-(\d+))?(r|s|seg|sec|min|passos|m)?$/i))) {
      if (sets == null) {
        sets = Number(m[1]);
        setUnit(m[4], Number(m[2]), m[3] ? Number(m[3]) : null);
      } else notes.push(t);
    }
    // x12, x12r, x10s
    else if ((m = t.match(/^x(\d+)(?:-(\d+))?(r|s|seg|sec|min|passos|m)?$/i))) {
      if (reps == null && duration == null) setUnit(m[3], Number(m[1]), m[2] ? Number(m[2]) : null);
      else notes.push(t);
    }
    // 10kg, +10kg, 12-15kg
    else if ((m = t.match(new RegExp(`^(\\+)?(${NUM})(?:-(${NUM}))?kg$`, "i")))) {
      if (load == null) {
        load = num(m[2]);
        item.loadMax = num(m[3]);
        item.loadMode = m[1] ? "added" : "abs";
      } else notes.push(t);
    }
    // 12r, 15passos, 10m
    else if ((m = t.match(/^(\d+)(?:-(\d+))?(r|passos|m)$/i))) {
      if (reps == null) setUnit(m[3], Number(m[1]), m[2] ? Number(m[2]) : null);
      else notes.push(t);
    }
    // 3s = sets, 30s / 10s (iso) = time
    else if ((m = t.match(/^(\d+)(?:-(\d+))?(s|seg|sec|min)$/i))) {
      const a = Number(m[1]);
      const isMin = m[3].toLowerCase() === "min";
      if (!isMin && !m[2] && a <= 6 && sets == null) sets = a;
      else if (!isMin && isIso && item.holdSec == null) item.holdSec = a;
      else if (duration == null) setUnit(m[3], a, m[2] ? Number(m[2]) : null);
      else notes.push(t);
    }
    // bare number
    else if ((m = t.match(/^(\d+)$/))) {
      if (reps == null) reps = Number(m[1]);
      else notes.push(t);
    } else notes.push(t);
  }

  if (reps == null && duration == null && load == null && sets == null) return;
  const n = sets ?? 1;
  item.sets = Array.from({ length: n }, () => row(reps, duration, load));
}

function row(reps: number | null, duration: number | null, load: number | null): SetRow {
  return { reps, duration, load, done: false };
}

/** 12x40kg/12x40kg/11x50kg · 12x40kg / 65kg x8 · Ski 2/1/0.5 min */
function parsePerSet(rx: string, item: Item): boolean {
  const segs = rx.split(/\s*[/|]\s*/).filter(Boolean);
  if (segs.length < 2 || !segs.every((s) => /\d/.test(s))) return false;
  if (/^\d+x\d+\s+\S*\d/i.test(segs[0])) return false; // "3x12 18kg / 3-4kg": two loads, not a pyramid

  const unit = rx.match(/(min|sec|seg|s)\s*$/i)?.[1]?.toLowerCase();
  const timeOnly = unit && !/kg/i.test(rx) && segs.every((s) => /^[\d.,]+\s*(min|sec|seg|s)?$/i.test(s));
  if (timeOnly) {
    const mult = unit === "min" ? 60 : 1;
    item.sets = segs.map((s) => row(null, Math.round((num(s.match(/[\d.,]+/)![0]) ?? 0) * mult), null));
    return true;
  }
  if (!segs.every((s) => /kg/i.test(s) || /^x?\d+r?$/i.test(s))) return false;

  item.sets = segs.map((s) => {
    const lm = s.match(new RegExp(`\\+?(${NUM})\\s*kg`, "i"));
    const load = lm ? num(lm[1]) : null;
    if (lm && s.trim().startsWith("+")) item.loadMode = "added";
    const restS = lm ? s.replace(lm[0], " ") : s;
    const rm = restS.match(/\d+/);
    return row(rm ? Number(rm[0]) : null, null, load);
  });
  // "12x 40kg /65kg x8": a segment without reps keeps the previous one's
  item.sets.forEach((r, i) => {
    if (r.reps == null && i > 0) r.reps = item.sets[i - 1].reps;
  });
  return true;
}

// ── Block headers ───────────────────────────────────────────────────────────

const HEADING =
  /^(flexibilidade( e| &| and)? mobilidade|flexibilidade|mobilidade|aquecimento|ativa[cç][aã]o|activa[cç][aã]o|finisher.*|core|cool ?down|retorno à calma)$/i;

/** 40"/20" x3 | 1:30 rest · 30/30 · Circuito 30/30 · 20min - 40s / 20s */
export function parseCircuitHeader(raw: string): Partial<Block> | null {
  const l = clean(raw);
  const m = l.match(
    /^(?:circuito\s*)?(?:(\d+)min\s*-?\s*)?(\d+)\s*(?:"|s|seg|sec)?\s*\/\s*(\d+)\s*(?:"|s|seg|sec)?\s*(?:x(\d+))?\s*(?:[|,-]\s*)?(?:(\d+):(\d+)|(\d+)\s*(s|min))?\s*(?:rest|descanso)?$/i,
  );
  if (!m) return null;
  const roundRest = m[5] ? Number(m[5]) * 60 + Number(m[6]) : m[7] ? Number(m[7]) * (m[8].toLowerCase() === "min" ? 60 : 1) : null;
  return {
    kind: "circuit",
    title: m[1] ? `${m[1]} min` : "Circuito",
    work: Number(m[2]),
    rest: Number(m[3]),
    rounds: m[4] ? Number(m[4]) : null,
    roundRest,
  };
}

function newBlock(partial: Partial<Block> = {}): Block {
  return { id: uid(), kind: "list", title: "", items: [], ...partial };
}

function finalizeKind(b: Block) {
  if (b.kind === "list" && b.items.some((i) => i.sets.length > 0)) b.kind = "sets";
}

/** One group of lines without blank lines between them → one or more blocks. */
function parseGroup(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  const push = (b: Block) => {
    if (cur) finalizeKind(cur);
    cur = b;
    blocks.push(b);
  };

  for (const raw of lines) {
    const l = clean(raw);
    if (!l) continue;
    const circ = parseCircuitHeader(l);
    if (circ) {
      push(newBlock(circ));
      continue;
    }
    if (/^(super ?set|bi-?set)$/i.test(l)) {
      push(newBlock({ kind: "superset", title: "Superset" }));
      continue;
    }
    if (HEADING.test(l)) {
      push(newBlock({ title: l }));
      continue;
    }
    // (Russian twist, side bends) → fillers done during the previous exercise's rest
    const paren = l.match(/^\((.*)\)$/);
    if (paren) {
      if (!cur) push(newBlock());
      for (const part of paren[1].split(/\s*[,;]\s*/).filter(Boolean)) {
        const it = parseItemLine(part);
        it.role = "filler";
        cur!.items.push(it);
      }
      continue;
    }
    const item = parseItemLine(l);
    // mobility list followed by prescribed work → start a new block
    const c = cur as Block | null;
    if (
      c &&
      c.kind === "list" &&
      item.sets.length > 0 &&
      c.items.length > 0 &&
      !c.items.some((i) => i.sets.length > 0)
    ) {
      push(newBlock());
    }
    if (!cur) push(newBlock());
    cur!.items.push(item);
  }
  if (cur) finalizeKind(cur);
  return blocks.filter((b) => b.items.length > 0 || b.title);
}

// ── Whole session / import ──────────────────────────────────────────────────

const DATE_RE = /^\**\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s*\**$/;
const SEP_RE = /^\s*[—–_\-─=~]{3,}\s*$/;
const TITLE_RE =
  /^(full ?body|superiores|inferiores|upper|lower|legs|pernas|tronco|hyrox.*|mesociclo.*|semana\s*\d+|treino\s.*|hiit.*|push|pull)$/i;

function toISO(d: string, m: string, y: string): string {
  const yy = y.length === 2 ? `20${y}` : y;
  return `${yy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Parse the text of one session (blank lines separate blocks). */
export function parseSessionText(text: string): ParsedSession {
  return parseImport(text)[0] ?? { date: null, title: "", blocks: [] };
}

/** Parse a whole notes dump: sessions split by separator or date lines. */
export function parseImport(text: string): ParsedSession[] {
  const sessions: ParsedSession[] = [];
  let cur: ParsedSession | null = null;
  let group: string[] = [];

  const flush = () => {
    if (group.length && cur) cur.blocks.push(...parseGroup(group));
    group = [];
  };
  const start = () => {
    flush();
    cur = { date: null, title: "", blocks: [] };
    sessions.push(cur);
    return cur;
  };

  for (const raw of text.split(/\r?\n/)) {
    const l = clean(raw);
    if (SEP_RE.test(raw)) {
      flush();
      cur = null;
      continue;
    }
    const dm = l.match(DATE_RE);
    if (dm) {
      const s: ParsedSession = !cur || (cur as ParsedSession).blocks.length || group.length || (cur as ParsedSession).date ? start() : cur;
      s.date = toISO(dm[1], dm[2], dm[3]);
      continue;
    }
    if (!l) {
      flush();
      continue;
    }
    const c = cur ?? start();
    if (!c.blocks.length && !group.length && TITLE_RE.test(l)) {
      c.title = c.title ? `${c.title} – ${l}` : l;
      continue;
    }
    group.push(raw);
  }
  flush();
  return sessions.filter((s) => s.blocks.length > 0);
}
