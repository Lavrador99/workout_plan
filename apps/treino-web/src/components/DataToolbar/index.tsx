import { onSave } from "@/utils/fileAutosave";
import { exportJSON, restoreSnapshot } from "@/utils/storage";
import { useEffect, useRef, useState } from "react";

interface DataToolbarProps {
  onRestored?: () => void;
  saveLabel?: string;
}

export function DataToolbar({ onRestored, saveLabel }: DataToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saveFlash, setSaveFlash] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    return onSave((status) => {
      setSaveFlash(status);
      setTimeout(() => setSaveFlash(null), 1800);
    });
  }, []);

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
      ? "✓ Guardado"
      : saveFlash === "error"
        ? "✗ Erro ao guardar na API"
        : (saveLabel ?? "✓ Guardado localmente");

  const indicatorColor =
    saveFlash === "error"
      ? "text-red-400"
      : saveFlash === "saved"
        ? "text-accent"
        : "text-muted";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-11 bg-bg/80 backdrop-blur-md border-b border-border">
      <span className={`text-[11px] transition-colors ${indicatorColor}`}>
        {saveIndicator}
      </span>
      <div className="flex items-center gap-2">
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
