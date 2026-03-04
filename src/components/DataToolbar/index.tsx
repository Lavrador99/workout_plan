import { isLinked, linkFile, onSave, unlinkFile } from "@/utils/fileAutosave";
import { exportJSON, restoreSnapshot } from "@/utils/storage";
import { useEffect, useRef, useState } from "react";

interface DataToolbarProps {
  onRestored?: () => void;
  saveLabel?: string;
}

export function DataToolbar({ onRestored, saveLabel }: DataToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linked, setLinked] = useState(isLinked());
  const [saveFlash, setSaveFlash] = useState<"saved" | "error" | null>(null);

  // Subscribe to write events for UI feedback
  useEffect(() => {
    return onSave((status) => {
      setLinked(isLinked());
      setSaveFlash(status);
      setTimeout(() => setSaveFlash(null), 1800);
    });
  }, []);

  const handleLink = async () => {
    if (linked) {
      await unlinkFile();
      setLinked(false);
    } else {
      const ok = await linkFile();
      setLinked(ok);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        restoreSnapshot(data);
        onRestored?.();
      } catch {
        alert("Ficheiro inválido");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const saveIndicator =
    saveFlash === "saved"
      ? "✓ Guardado no ficheiro"
      : saveFlash === "error"
        ? "✗ Erro ao guardar"
        : linked
          ? (saveLabel ?? "🔗 Ficheiro ligado")
          : (saveLabel ?? "✓ Guardado localmente");

  const indicatorColor =
    saveFlash === "error"
      ? "text-red-400"
      : saveFlash === "saved"
        ? "text-accent"
        : linked
          ? "text-green-400"
          : "text-muted";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-11 bg-bg/80 backdrop-blur-md border-b border-border">
      {/* Save indicator */}
      <span className={`text-[11px] transition-colors ${indicatorColor}`}>
        {saveIndicator}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleLink}
          title={
            linked
              ? "Desligar ficheiro de auto-save"
              : "Ligar treino_autosave.json para auto-save automático"
          }
          className={`text-[11px] border rounded px-2.5 py-1 transition-colors ${
            linked
              ? "border-green-400 text-green-400 hover:border-red-400 hover:text-red-400"
              : "border-border text-muted hover:text-accent hover:border-accent"
          }`}
        >
          {linked ? "🔗 Ligado" : "🔗 Ligar ficheiro"}
        </button>
        <button
          onClick={() => exportJSON()}
          className="text-[11px] border border-border rounded px-2.5 py-1 text-muted hover:text-accent hover:border-accent transition-colors"
        >
          ↑ Exportar
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-[11px] border border-border rounded px-2.5 py-1 text-muted hover:text-accent2 hover:border-accent2 transition-colors"
        >
          ↓ Importar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
