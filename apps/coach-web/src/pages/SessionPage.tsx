import { useEffect, useRef, useState } from "react";
import BlockCard, { KIND_DEFAULTS } from "../components/BlockCard";
import DragHandle from "../components/DragHandle";
import { copyBlock, duplicateSession, linkItems, newSession, remove, save, templateBlocks } from "../lib/db";
import { fmtSession } from "../lib/format";
import { history, suggest } from "../lib/history";
import { go, useClient, useSession, useSessions, useTemplates } from "../lib/hooks";
import { SessionCtx } from "../lib/sessionContext";
import { parseSessionText } from "../lib/parser";
import { useReorder } from "../lib/reorder";
import { uid } from "../lib/text";
import type { Block, Session, Template } from "../lib/types";

const TITLES = ["Fullbody", "Superiores", "Inferiores", "Hyrox Sim", "Core", "Mobilidade"];

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
  const [paste, setPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [newBlock, setNewBlock] = useState<string | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<Session | null>(null);
  const reorder = useReorder(s?.blocks ?? [], (blocks) => s && update({ ...s, blocks }));

  // Local copy for instant edits; DB updates from sync are taken when not mid-edit.
  useEffect(() => {
    if (stored && !pending.current) setS(stored);
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
    setS(next);
    latest.current = next;
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void flush(), 400);
  };

  if (stored === null) return <p className="p-4 text-muted">Sessão não encontrada.</p>;
  if (!s) return null;

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

  const applyPaste = () => {
    const p = parseSessionText(pasteText);
    update({ ...s, title: s.title || p.title, date: p.date ?? s.date, blocks: [...s.blocks, ...p.blocks] });
    setPasteText("");
    setPaste(false);
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
    go("client", s.clientId);
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

  return (
    <SessionCtx.Provider value={ctx}>
    <div className="flex flex-col gap-3 p-3 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost -ml-2" onClick={() => void flush().then(() => go("client", s.clientId))}>
          ← {client?.name ?? ""}
        </button>
        <span className="ml-auto text-xs text-muted tabular-nums">{total > 0 && `${done}/${total} séries`}</span>
        {total > 0 && done === 0 && (
          <button type="button" className="btn text-accent" onClick={progressAll}>
            ↑ Progressão
          </button>
        )}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <input type="date" className="input w-auto" value={s.date} onChange={(e) => update({ ...s, date: e.target.value })} />
        <input className="input font-bold" list="titles" value={s.title} placeholder="Título (Fullbody, Inferiores…)" onChange={(e) => update({ ...s, title: e.target.value })} />
        <datalist id="titles">
          {TITLES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

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

      {reorder.ordered.map((b, i, all) => (
        <div key={b.id} ref={reorder.ref(b.id)} className={`flex flex-col gap-1 ${reorder.dragging === b.id ? "opacity-60" : ""}`}>
          {b.section && b.section !== all[i - 1]?.section && <h2 className="label text-accent mt-2">{b.section}</h2>}
          <BlockCard
            block={b}
            onChange={(nb) => setBlocks(s.blocks.map((x) => (x.id === b.id ? nb : x)))}
            onDelete={() => setBlocks(s.blocks.filter((x) => x.id !== b.id))}
            onMove={(d) => moveBlock(i, d)}
            onDuplicate={() => duplicateBlock(b)}
            handle={s.blocks.length > 1 ? <DragHandle {...reorder.handle(b.id)} /> : undefined}
            autoPick={b.id === newBlock}
          />
        </div>
      ))}

      <div className="card p-3 flex flex-col gap-2">
        <span className="label">Adicionar bloco</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => addBlock("list")}>
            + Lista / mobilidade
          </button>
          <button type="button" className="btn" onClick={() => addBlock("sets")}>
            + Séries
          </button>
          <button type="button" className="btn" onClick={() => addBlock("superset")}>
            + Superset
          </button>
          <button type="button" className="btn" onClick={() => addBlock("circuit")}>
            + Circuito / HIIT
          </button>
          <button type="button" className="btn" onClick={() => addBlock("emom")}>
            + EMOM
          </button>
          <button type="button" className="btn" onClick={() => addBlock("amrap")}>
            + AMRAP
          </button>
          {s.blocks.length > 0 &&
            days.map((t) => (
              <button key={t.id} type="button" className="btn text-accent2" onClick={() => confirm(`Juntar os blocos de «${t.name}» a esta sessão?`) && applyDay(t)}>
                📅 {t.name}
              </button>
            ))}
          {blockTemplates.map((t) => (
            <button key={t.id} type="button" className="btn text-accent2" onClick={() => setBlocks([...s.blocks, copyBlock(t.block)])}>
              ☆ {t.name}
            </button>
          ))}
          <button type="button" className="btn-accent" onClick={() => setPaste(!paste)}>
            ✎ Escrever / colar texto
          </button>
        </div>
        {paste && (
          <div className="flex flex-col gap-2">
            <textarea
              className="input min-h-[220px] py-2 font-mono text-sm"
              autoFocus
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Flexibilidade e mobilidade\nElephant wall\nThread the needle\n\nBack squat 4x8 47,5kg\n(Russian twist, side bends)\nStep up 3x8 2x8kg E+1\n\n40\"/20\" x3 | 1:30 rest\nDevil press\nWall ball"}
            />
            <p className="text-xs text-muted">Uma linha por exercício. Linha em branco = novo bloco. (entre parênteses) = intercalado.</p>
            <button type="button" className="btn-accent" onClick={applyPaste} disabled={!pasteText.trim()}>
              Adicionar à sessão
            </button>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="label">Notas da sessão</span>
        <textarea className="input py-2 min-h-[70px]" value={s.notes} onChange={(e) => update({ ...s, notes: e.target.value })} />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={copy}>
          {copied ? "✓ Copiado" : "Copiar texto"}
        </button>
        {"share" in navigator && (
          <button type="button" className="btn" onClick={share}>
            Partilhar
          </button>
        )}
        <button type="button" className="btn" onClick={duplicate}>
          Duplicar para hoje
        </button>
        {s.blocks.length > 0 && (
          <button type="button" className="btn" onClick={saveDay}>
            ☆ Template de dia
          </button>
        )}
        <button type="button" className="btn text-danger ml-auto" onClick={del}>
          Apagar
        </button>
      </div>
    </div>
    </SessionCtx.Provider>
  );
}

export async function openNewSession(clientId: string, from?: Session) {
  const s = await save("sessions", from ? duplicateSession(from) : newSession(clientId));
  go("session", s.id);
}
