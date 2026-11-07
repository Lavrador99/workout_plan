import { useEffect, useState } from "react";
import Sheet, { SheetFooter } from "./Sheet";

// In-app replacements for confirm() and prompt(): same look as the rest of the
// app, and they work where the installed PWA blocks or restyles browser dialogs.

type Request = { message: string; resolve: (v: string | boolean | null) => void } & ({ text?: false } | { text: true; value: string });

let show: ((r: Request) => void) | null = null;

const DANGER = ["Apagar", "Tirar", "Desligar"];
/** "Apagar esta sessão?" → the button says "Apagar". */
const verbOf = (message: string) => /^[A-ZÀ-Ú][a-zà-ú]+r(?=\s)/.exec(message)?.[0] ?? "Confirmar";

export const ask = (message: string) => new Promise<boolean>((resolve) => (show ? show({ message, resolve: (v) => resolve(!!v) }) : resolve(false)));

export const askText = (message: string, value = "") => new Promise<string | null>((resolve) => (show ? show({ message, text: true, value, resolve: (v) => resolve(typeof v === "string" ? v : null) }) : resolve(null)));

export function DialogHost() {
  const [req, setReq] = useState<Request | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    show = (r) => {
      setReq(r);
      setValue(r.text ? r.value : "");
    };
    return () => {
      show = null;
    };
  }, []);

  if (!req) return null;
  const done = (v: string | boolean | null) => {
    req.resolve(v);
    setReq(null);
  };
  const verb = req.text ? "Guardar" : verbOf(req.message);

  return (
    <Sheet title={req.text ? req.message : "Confirmar"} transient onClose={() => done(null)}>
      <form
        className="flex flex-col gap-3 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          done(req.text ? value : true);
        }}
      >
        {req.text ? <input className="input" autoFocus aria-label={req.message} value={value} onChange={(e) => setValue(e.target.value)} onFocus={(e) => e.target.select()} /> : <p className="text-sm whitespace-pre-line">{req.message}</p>}
        <SheetFooter>
          <button type="button" className="btn flex-1" onClick={() => done(null)}>
            Cancelar
          </button>
          <button type="submit" autoFocus={!req.text} className={`flex-1 ${DANGER.includes(verb) ? "btn bg-danger text-on-accent border-danger" : "btn-accent"}`}>
            {verb}
          </button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}
