import { useEffect, useRef, useState } from "react";

// Hash router: #/client/abc → ["client", "abc"].
//
// Every history entry carries `i`, its position since the app was opened, so "back"
// can tell a real previous page from a link opened directly. Sheets add an entry of
// their own (`sheet`, how many are open), so the phone's back button closes them.

const readHash = () => location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
const toHash = (parts: string[]) => "#/" + parts.map(encodeURIComponent).join("/");
const openSheets = (): number => history.state?.sheet ?? 0;

// read at load too: pages mount before useRoute's effect runs (a reload keeps history.state)
let index: number = typeof history.state?.i === "number" ? history.state.i : 0;
/** The next route change starts at the top, not a return to where it was. */
let fresh = false;
/** The next route change is another page, not another view (tab) of the same one. */
let newPage = false;
/** A history traversal is on its way: closing sheets must not start another one. */
let leaving = false;
/** Per history entry (by `i`): where the page was scrolled and its view state (open rows, filters…). */
const scrollAt = new Map<number, number>();
const views = new Map<number, Map<string, unknown>>();

let restoring: ReturnType<typeof setTimeout> | undefined;

function notifyRoute() {
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Pages load their data after the route changes, so wait until there is room to scroll to.
 *  Gives up after ~1.5s, or as soon as the user scrolls or taps themselves. */
function restoreScroll(y: number) {
  clearTimeout(restoring);
  let tries = 75;
  const stop = () => {
    clearTimeout(restoring);
    for (const e of USER_INPUT) window.removeEventListener(e, stop);
  };
  const step = () => {
    window.scrollTo(0, y);
    if (window.scrollY < y - 1 && tries-- > 0) restoring = setTimeout(step, 20);
    else stop();
  };
  if (y > 0) for (const e of USER_INPUT) window.addEventListener(e, stop, { passive: true, once: true });
  step();
}
const USER_INPUT = ["wheel", "touchstart", "keydown", "mousedown"] as const;

export function useRoute(): string[] {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    history.scrollRestoration = "manual";
    if (typeof history.state?.i !== "number") history.replaceState({ ...history.state, i: 0 }, "");
    index = history.state.i;

    const onHash = () => {
      // whichever way the page is left (link, back, forward), remember where it was; the
      // browser has not scrolled yet: restoration is manual
      scrollAt.set(index, window.scrollY);
      if (typeof history.state?.i === "number") index = history.state.i;
      else history.replaceState({ ...history.state, i: ++index }, "");
      // a new page at this position: what an older page left there is not its own
      if (newPage) {
        scrollAt.delete(index);
        views.delete(index);
      }
      newPage = false;
      const y = fresh ? 0 : (scrollAt.get(index) ?? 0);
      fresh = false;
      setRoute(readHash());
      restoreScroll(y);
    };
    const onPop = () => {
      leaving = false;
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  return route;
}

/** Open a page. Going where you already are scrolls back to the top. */
export function go(...parts: string[]) {
  const hash = toHash(parts);
  if (hash === (location.hash || "#/")) return window.scrollTo({ top: 0, behavior: "smooth" });
  fresh = true;
  newPage = true;
  if (openSheets()) {
    // leaving from a sheet: the new page takes the sheet's entry, one step above the page under it
    history.replaceState({ i: index + 1 }, "", hash);
    notifyRoute();
  } else location.hash = hash;
}

/** Change the route in place: same page, another view of it (a tab), no extra back step. */
export function replaceRoute(...parts: string[]) {
  fresh = true;
  const { sheet: _sheet, ...state } = history.state ?? {};
  history.replaceState(state, "", toHash(parts));
  notifyRoute();
}

/** Back to where you came from, or to `parent` when the page was opened directly. */
export function back(...parent: string[]) {
  if (!history.state?.i) {
    newPage = true;
    return replaceRoute(...parent);
  }
  leaving = true;
  history.go(-1 - openSheets());
}

/**
 * useState that survives leaving the page and coming back with "back": it belongs to this
 * history entry, so opening the same page again as a new one starts clean.
 * `key` must be unique on the page (e.g. `open:${item.id}`).
 */
export function useViewState<T>(key: string, initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
  const at = useRef(index);
  const [value, setValue] = useState<T>(() => {
    const saved = views.get(at.current);
    if (saved?.has(key)) return saved.get(key) as T;
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  const set = (v: T | ((prev: T) => T)) =>
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      let m = views.get(at.current);
      if (!m) views.set(at.current, (m = new Map()));
      m.set(key, next);
      return next;
    });
  return [value, set];
}

/** Forget this page's view state under `prefix`, e.g. when a sheet opens anew. */
export function clearViewState(prefix: string) {
  const m = views.get(index);
  if (m) for (const k of [...m.keys()]) if (k.startsWith(prefix)) m.delete(k);
}

/** A sheet just closed; one opening in the same commit takes over its history entry. */
let closing: { timer: ReturnType<typeof setTimeout>; depth: number } | null = null;

/** While mounted, the back button closes this overlay instead of leaving the page. */
export function useBackClose(onClose: () => void, enabled = true) {
  const latest = useRef(onClose);
  latest.current = onClose;
  const depth = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (closing) {
      clearTimeout(closing.timer);
      depth.current = closing.depth;
      closing = null;
    } else {
      depth.current = openSheets() + 1;
      history.pushState({ ...history.state, sheet: depth.current }, "");
    }
    const onPop = () => {
      if (openSheets() < depth.current) latest.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      const mine = depth.current;
      const timer = setTimeout(() => {
        closing = null;
        if (!leaving && openSheets() >= mine) history.back();
      }, 0);
      closing = { timer, depth: mine };
    };
  }, [enabled]);
}
