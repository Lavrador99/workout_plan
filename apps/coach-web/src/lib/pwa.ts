// Installable-app plumbing: service worker updates, the install prompt and
// persistent storage (so the browser never evicts the local data).

import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  updateReady: boolean;
  installEvent: InstallPromptEvent | null;
  installed: boolean;
  persisted: boolean | null;
}

let state: PwaState = {
  updateReady: false,
  installEvent: null,
  installed: isStandalone(),
  persisted: null,
};
const listeners = new Set<(s: PwaState) => void>();
function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((f) => f(state));
}

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function startPwa() {
  updateSW = registerSW({
    onNeedRefresh: () => set({ updateReady: true }),
    onRegisteredSW: (_url, reg) => {
      // installed apps rarely reload, so look for a new version every hour
      if (reg) setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    set({ installEvent: e as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => set({ installed: true, installEvent: null }));

  void navigator.storage
    ?.persisted?.()
    .then((p) => (p ? true : (navigator.storage.persist?.() ?? false)))
    .then((p) => set({ persisted: !!p }))
    .catch(() => set({ persisted: false }));
}

export async function applyUpdate() {
  await updateSW?.(true);
}

export async function promptInstall(): Promise<boolean> {
  const e = state.installEvent;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  set({ installEvent: null, installed: outcome === "accepted" || state.installed });
  return outcome === "accepted";
}

export function usePwa(): PwaState {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    return () => void listeners.delete(setS);
  }, []);
  return s;
}
