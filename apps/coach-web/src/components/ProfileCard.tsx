import { useEffect, useState } from "react";
import Field from "./Field";
import { newProfile, save } from "../lib/db";
import { useProfile } from "../lib/hooks";
import { reduceImage } from "../lib/image";
import type { CoachProfile } from "@treino/core/types";

/** The coach as shown on reports. Typed fields are saved when they lose focus. */
export default function ProfileCard() {
  const stored = useProfile();
  const [p, setP] = useState<CoachProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (stored !== undefined) setP(stored ?? newProfile());
  }, [stored]);

  if (!p) return null;
  const edit = (patch: Partial<CoachProfile>) => setP({ ...p, ...patch });
  const persist = (next = p) => {
    if (JSON.stringify(next) !== JSON.stringify(stored ?? newProfile())) void save("profiles", next);
  };
  const text = (key: "name" | "title" | "licence" | "phone" | "email" | "instagram", label: string, placeholder = "", type = "text") => (
    <Field label={label}>
      <input className="input" type={type} autoComplete="off" value={p[key]} placeholder={placeholder} onChange={(e) => edit({ [key]: e.target.value })} />
    </Field>
  );

  return (
    <section className="card p-3 flex flex-col gap-3" onBlur={() => persist()}>
      <div>
        <h2 className="font-bold">Perfil profissional</h2>
        <p className="text-xs text-muted">Aparece no cabeçalho e no rodapé dos relatórios.</p>
      </div>
      {text("name", "Nome")}
      {text("title", "Título")}
      {text("licence", "N.º do título profissional (IPDJ)")}
      <div className="grid grid-cols-2 gap-2">
        {text("phone", "Telefone", "", "tel")}
        {text("email", "Email", "", "email")}
      </div>
      {text("instagram", "Instagram", "@")}
      <div className="flex flex-col gap-2">
        <span className="label">Logótipo</span>
        {p.logo && <img src={p.logo} alt="Logótipo" className="max-h-20 max-w-[200px] object-contain self-start" />}
        <div className="flex gap-2">
          <label className="btn cursor-pointer">
            {p.logo ? "Trocar" : "Carregar imagem"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const next = { ...p, logo: await reduceImage(file) };
                  setP(next);
                  persist(next);
                  setError("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
            />
          </label>
          {p.logo && (
            <button
              type="button"
              className="btn text-danger"
              onClick={() => {
                const next = { ...p, logo: null };
                setP(next);
                persist(next);
              }}
            >
              Tirar
            </button>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </section>
  );
}
