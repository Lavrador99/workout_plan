import { useEffect, useRef, useState } from "react";
import BlockCard, { KIND_DEFAULTS } from "../components/BlockCard";
import DragHandle from "../components/DragHandle";
import ExtrasSheet from "../components/ExtrasSheet";
import LiveView, { fmtClock, useNow } from "../components/LiveView";
import PageHeader, { NotFound } from "../components/PageHeader";
import PrescribeSheet from "../components/PrescribeSheet";
import { Menu } from "../components/Sheet";
import { copyBlock, duplicateSession, linkItems, newSession, remove, save, templateBlocks } from "../lib/db";
import { fmtSession } from "../lib/format";
import { history, suggest } from "../lib/history";
import { back, go, useClient, useSession, useSessions, useTemplates } from "../lib/hooks";
import { SessionCtx } from "../lib/sessionContext";
import { itemsFromLine, parseSessionText } from "../lib/parser";
import { useReorder } from "../lib/reorder";
import { fmtDate, uid } from "../lib/text";
import type { Block, Item, Section, Session, Template } from "../lib/types";

const TITLES = ["Fullbody", "Superiores", "Inferiores", "Hyrox Sim", "Core", "Mobilidade"];

/** A session started longer ago than this is not reopened live (forgot to finish it). */
const LIVE_RESUME_MS = 4 * 3600_000;

/** Plain exercises one after the other; every other kind is a grouped block (an extra). */
const isPlain = (b: Block) => b.kind === "list" || b.kind === "sets";

/** Link new/renamed items to the library before saving. */
async function withLinks(s: Session): Promise<Session> {
  if (s.blocks.every((b) => b.items.every((i) => i.exerciseId || !i.name))) return s;
  const blocks: Block[] = [];
  for (const b of s.blocks) blocks.push({ ...b, items: await linkItems(b.items) });
  return { ...s, blocks };
}

export default function SessionPage({ id }: { id: string }) {
  const stored = useSession(id);
  const client = useClient(stored?.clientId ?? "");
  const clientSessions = useSessions(stored?.clientId ?? "");
  const templates = useTemplates();
  const [s, setS] = useState<Session | null>(null);
  const [extras, setExtras] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  /** Where "+ Exercício" adds: the last plain block, or a new one made on the first add. */
  const [target, setTarget] = useState<Block | null>(null);
  const [copied, setCopied] = useState(false);
  const current = useRef<Session | null>(null);
  const [newBlock, setNewBlock] = useState<string | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<Session | null>(null);
  const reorder = useReorder(s?.blocks ?? [], (blocks) => s && update({ ...s, blocks }));
  const [live, setLive] = useState(false);
  const resumed = useRef(false);

  // Local copy for instant edits; DB updates from sync are taken when not mid-edit.
  useEffect(() => {
    if (stored && !pending.current) setS(stored);
    // reopening a session that is still running goes straight back to it
    if (stored && !resumed.current) {
      resumed.current = true;
      if (stored.startedAt && !stored.endedAt && Date.now() - stored.startedAt < LIVE_RESUME_MS) setLive(true);
    }
  }, [stored]);

  const flush = async () => {
    clearTimeout(pending.current);
    pending.current = undefined;
    const s = latest.current;
    latest.current = null;
    if (s) await save("sessions", await withLinks(s));
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (next: Session) => {
    current.current = next;
    setS(next);
    latest.current = next;
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void flush(), 400);
  };

  if (stored === null) return <NotFound title="Sessão" back={[""]} />;
  if (!s) return null;
  current.current = s;

  const setBlocks = (blocks: Block[]) => update({ ...s, blocks });
  const moveBlock = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= s.blocks.length) return;
    const blocks = [...s.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    setBlocks(blocks);
  };

  const addBlock = (kind: Block["kind"]) => {
    const id = uid();
    setNewBlock(id); // its exercise picker opens straight away
    // a new block stays in the section of the one before it
    const section = s.blocks[s.blocks.length - 1]?.section;
    setBlocks([...s.blocks, { id, kind, section, title: "", items: [], ...KIND_DEFAULTS[kind] }]);
  };

  const openPicker = () => {
    const last = s.blocks[s.blocks.length - 1];
    setTarget(last && isPlain(last) ? last : { id: uid(), kind: "sets", section: last?.section, title: "", items: [] });
  };

  // Several exercises can be added before a re-render, so this works on the latest session.
  const addPlain = (items: Item[]) => {
    const cur = current.current;
    if (!cur || !target) return;
    const has = cur.blocks.some((b) => b.id === target.id);
    const grow = (b: Block): Block => ({ ...b, kind: b.kind === "list" && items.some((i) => i.sets.length) ? "sets" : b.kind, items: [...b.items, ...items] });
    update({ ...cur, blocks: has ? cur.blocks.map((b) => (b.id === target.id ? grow(b) : b)) : [...cur.blocks, grow(target)] });
  };

  const startSection = (section: Section) => setBlocks([...s.blocks, { id: uid(), kind: "sets", section, title: "", items: [] }]);

  const duplicateBlock = (b: Block) => {
    const i = s.blocks.findIndex((x) => x.id === b.id);
    setBlocks([...s.blocks.slice(0, i + 1), copyBlock(b), ...s.blocks.slice(i + 1)]);
  };

  const days = templates?.filter((t) => t.blocks?.length) ?? [];
  const blockTemplates = templates?.filter((t) => !t.blocks?.length) ?? [];

  const applyDay = (t: Template) => update({ ...s, title: s.title || t.title || t.name, blocks: [...s.blocks, ...templateBlocks(t).map(copyBlock)] });

  const saveDay = async () => {
    const name = prompt("Nome do template de dia", s.title)?.trim();
    if (!name) return;
    const blocks = s.blocks.map(copyBlock);
    await save<Template>("templates", { id: uid(), updatedAt: 0, name, title: s.title, block: blocks[0], blocks });
    alert(`Template «${name}» guardado.`);
  };

  const applyText = (text: string) => {
    const p = parseSessionText(text);
    update({ ...s, title: s.title || p.title, date: p.date ?? s.date, blocks: [...s.blocks, ...p.blocks] });
  };

  const text = fmtSession(s);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text.replace(/\*\*/g, "*"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt("Copia o texto:", text);
    }
  };
  const share = () => navigator.share?.({ text: text.replace(/\*\*/g, "*") }).catch(() => {});

  const duplicate = async () => {
    await flush();
    const copy = await save("sessions", duplicateSession(s));
    go("session", copy.id);
  };

  const del = async () => {
    if (!confirm("Apagar esta sessão?")) return;
    clearTimeout(pending.current);
    latest.current = null;
    await remove("sessions", s.id);
    back("client", s.clientId);
  };

  const ctx = { clientId: s.clientId, sessionId: s.id, date: s.date, sessions: clientSessions ?? [] };

  /** Apply "progress" to every exercise that was fully done last time. */
  const progressAll = () => {
    let n = 0;
    const blocks = s.blocks.map((b) => ({
      ...b,
      items: b.items.map((it) => {
        if (!it.sets.length || it.sets.some((x) => x.done)) return it;
        const sg = suggest(history(ctx.sessions, it, { before: s.date, excludeId: s.id })[0]);
        if (sg?.kind !== "progress") return it;
        n++;
        return sg.apply(it);
      }),
    }));
    if (!n) return alert("Nada para progredir: nenhum exercício foi feito por completo na última vez.");
    if (confirm(`Subir ${n} exercício(s) que foram feitos por completo na última vez?`)) setBlocks(blocks);
  };

  const done = s.blocks.reduce((n, b) => n + b.items.reduce((m, i) => m + i.sets.filter((x) => x.done).length, 0), 0);
  const total = s.blocks.reduce((n, b) => n + b.items.reduce((m, i) => m + i.sets.length, 0), 0);

  const startLive = () => {
    // a finished session is resumed: the clock keeps its start
    update({ ...s, startedAt: s.startedAt ?? Date.now(), endedAt: null });
    setLive(true);
  };

  if (live)
    return (
      <SessionCtx.Provider value={ctx}>
        <LiveView session={s} onChange={update} onMinimize={() => setLive(false)} />
      </SessionCtx.Provider>
    );

  return (
    <SessionCtx.Provider value={ctx}>
    <PageHeader
      title={s.title || "Sessão"}
      subtitle={[client?.name, fmtDate(s.date), total > 0 && `${done}/${total} séries`, s.noAdherence && "fora da adesão"].filter(Boolean).join(" · ")}
      back={["client", s.clientId]}
      actions={
        <>
          {total > 0 && done === 0 && (
            <button type="button" className="btn text-accent shrink-0" onClick={progressAll}>
              ↑ Progressão
            </button>
          )}
          <Menu
            title="Opções da sessão"
            items={[
              { label: copied ? "✓ Copiado" : "Copiar texto", onClick: copy, keepOpen: true },
              "share" in navigator && { label: "Partilhar", onClick: share },
              { label: "Duplicar para hoje", onClick: duplicate },
              { label: s.noAdherence ? "Contar para a adesão" : "Não contar para a adesão", onClick: () => update({ ...s, noAdherence: !s.noAdherence }) },
              s.blocks.length > 0 && { label: "☆ Guardar como template de dia", onClick: saveDay },
              { label: "Apagar sessão", onClick: del, danger: true },
            ]}
          />
        </>
      }
    />
    <div className="page">
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <input type="date" className="input w-auto" value={s.date} onChange={(e) => update({ ...s, date: e.target.value })} />
        <input className="input font-bold" list="titles" value={s.title} placeholder="Título (Fullbody, Inferiores…)" onChange={(e) => update({ ...s, title: e.target.value })} />
        <datalist id="titles">
          {TITLES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      {s.blocks.some((b) => b.items.length) && <LiveBar session={s} onStart={startLive} />}

      {s.blocks.length === 0 && days.length > 0 && (
        <div className="card p-3 flex flex-col gap-2">
          <span className="label">Começar com um dia</span>
          <div className="grid grid-cols-2 gap-2">
            {days.map((t) => (
              <button key={t.id} type="button" className="btn-accent" onClick={() => applyDay(t)}>
                {t.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Depois ajusta: toca num exercício para trocar ou mudar séries, cargas e cadência.</p>
        </div>
      )}

      {reorder.ordered.map((b, i, all) => {
        const heading = b.section && b.section !== all[i - 1]?.section;
        const empty = isPlain(b) && !b.items.length && !b.title;
        return (
          <div key={b.id} ref={reorder.ref(b.id)} className={`flex flex-col gap-1 ${reorder.dragging === b.id ? "opacity-60" : ""}`}>
            {heading && (
              <h2 className="label text-accent mt-2 flex items-center gap-2">
                {b.section}
                {empty && (
                  <button type="button" className="text-muted" onClick={() => setBlocks(s.blocks.filter((x) => x.id !== b.id))} aria-label="Tirar secção">
                    ✕
                  </button>
                )}
              </h2>
            )}
            <BlockCard
              block={b}
              plain={isPlain(b)}
              onChange={(nb) => setBlocks(s.blocks.map((x) => (x.id === b.id ? nb : x)))}
              onDelete={() => setBlocks(s.blocks.filter((x) => x.id !== b.id))}
              onMove={(d) => moveBlock(i, d)}
              onDuplicate={() => duplicateBlock(b)}
              handle={s.blocks.length > 1 ? <DragHandle {...reorder.handle(b.id)} /> : undefined}
              autoPick={b.id === newBlock}
            />
          </div>
        );
      })}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button type="button" className="btn-accent h-12 text-base" onClick={openPicker}>
          + Exercício
        </button>
        <button type="button" className="btn h-12" onClick={() => setExtras(true)}>
          ⊞ Blocos
        </button>
      </div>

      {(s.notes || showNotes) && (
        <label className="flex flex-col gap-1">
          <span className="label">Notas da sessão</span>
          <textarea className="input py-2 min-h-[70px]" autoFocus={showNotes && !s.notes} value={s.notes} onChange={(e) => update({ ...s, notes: e.target.value })} />
        </label>
      )}

      {target && (
        <PrescribeSheet block={s.blocks.find((b) => b.id === target.id) ?? target} onAddText={(t) => addPlain(itemsFromLine(t))} onAdd={(it) => addPlain([it])} onClose={() => setTarget(null)} />
      )}

      {extras && (
        <ExtrasSheet
          days={days}
          blocks={blockTemplates}
          onGroup={addBlock}
          onSection={startSection}
          onTemplate={(t) => (t.blocks?.length ? applyDay(t) : setBlocks([...s.blocks, copyBlock(t.block)]))}
          onText={applyText}
          onNote={() => setShowNotes(true)}
          onClose={() => setExtras(false)}
        />
      )}
    </div>
    </SessionCtx.Provider>
  );
}

/** Start / back to / resume the live session. */
function LiveBar({ session: s, onStart }: { session: Session; onStart: () => void }) {
  const now = useNow();
  if (!s.startedAt)
    return (
      <button type="button" className="btn-accent h-14 text-lg" onClick={onStart}>
        ▶ Iniciar treino
      </button>
    );
  if (!s.endedAt)
    return (
      <button type="button" className="btn h-14 text-base border-danger/60" onClick={onStart}>
        <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
        Ao vivo · <span className="tabular-nums">{fmtClock(now - s.startedAt)}</span> — voltar ao treino
      </button>
    );
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="text-success">✓</span> Treino de {Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000))} min
      <button type="button" className="btn-ghost ml-auto text-accent2" onClick={onStart}>
        Retomar
      </button>
    </div>
  );
}

export async function openNewSession(clientId: string, from?: Session) {
  const s = await save("sessions", from ? duplicateSession(from) : newSession(clientId));
  go("session", s.id);
}
